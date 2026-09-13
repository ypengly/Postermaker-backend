import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { ok } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { checkoutSchema } from "../validation/schemas.js";
import { createCheckoutSession } from "../services/billing.service.js";

export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth);

subscriptionRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const sub = await prisma.subscription.upsert({
      where: { userId: req.userId! },
      create: { userId: req.userId! },
      update: {},
    });
    return ok(res, sub);
  })
);

subscriptionRouter.post(
  "/checkout",
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = checkoutSchema.parse(req.body);
    const session = await createCheckoutSession(req.userId!, input.plan, input.billingCycle);
    return ok(res, session);
  })
);
