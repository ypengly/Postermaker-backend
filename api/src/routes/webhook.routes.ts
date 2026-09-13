import { Router } from "express";
import express from "express";
import { stripe, handleStripeWebhookEvent } from "../services/billing.service.js";
import { asyncHandler } from "../middleware/errors.js";
import { Errors, fail } from "../lib/http.js";

export const webhookRouter = Router();

// IMPORTANT: this route must be mounted BEFORE the global `express.json()` body parser
// in index.ts — Stripe signature verification needs the untouched raw request body.
webhookRouter.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) return fail(res, Errors.validation("Missing Stripe signature."));

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, secret);
    } catch {
      return fail(res, Errors.validation("Invalid Stripe webhook signature."));
    }

    await handleStripeWebhookEvent(event);
    return res.json({ received: true });
  })
);
