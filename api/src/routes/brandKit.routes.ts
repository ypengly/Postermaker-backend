import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { ok } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { brandKitSchema } from "../validation/schemas.js";

export const brandKitRouter = Router();
brandKitRouter.use(requireAuth);

brandKitRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const kit = await prisma.brandKit.upsert({
      where: { ownerId: req.userId! },
      create: { ownerId: req.userId! },
      update: {},
      include: { assets: true },
    });
    return ok(res, kit);
  })
);

brandKitRouter.put(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = brandKitSchema.parse(req.body);
    const kit = await prisma.brandKit.update({ where: { ownerId: req.userId! }, data: input });
    return ok(res, kit);
  })
);
