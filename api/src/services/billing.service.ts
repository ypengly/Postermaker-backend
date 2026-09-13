import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";
import type { PlanTier } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2024-06-20" });

const PRICE_IDS: Record<string, string | undefined> = {
  "PRO:monthly": process.env.STRIPE_PRICE_PRO_MONTHLY,
  "PRO:yearly": process.env.STRIPE_PRICE_PRO_YEARLY,
  "BUSINESS:monthly": process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  "BUSINESS:yearly": process.env.STRIPE_PRICE_BUSINESS_YEARLY,
};

export async function createCheckoutSession(userId: string, plan: "PRO" | "BUSINESS", billingCycle: "monthly" | "yearly") {
  const priceId = PRICE_IDS[`${plan}:${billingCycle}`];
  if (!priceId) throw new Error(`No Stripe price configured for ${plan}:${billingCycle}`);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let sub = await prisma.subscription.findUnique({ where: { userId } });

  let customerId = sub?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId } });
    customerId = customer.id;
    sub = await prisma.subscription.update({ where: { userId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.WEB_ORIGIN}/dashboard?checkout=success`,
    cancel_url: `${process.env.WEB_ORIGIN}/pricing?checkout=cancelled`,
    metadata: { userId, plan },
  });

  return { url: session.url };
}

// Called from the Stripe webhook endpoint — this is the ONLY place that ever promotes a user's plan.
// The frontend must never be trusted to set plan tier directly.
export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as PlanTier | undefined;
      if (userId && plan) {
        await prisma.subscription.update({
          where: { userId },
          data: { plan, status: "ACTIVE", stripeSubscriptionId: session.subscription as string },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: "FREE", status: "CANCELED" },
      });
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: invoice.customer as string },
        data: { status: "PAST_DUE" },
      });
      break;
    }
    default:
      break;
  }
}

export { stripe };
