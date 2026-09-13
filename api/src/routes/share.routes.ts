import { Router } from "express";
import { randomUUID } from "node:crypto";
import { requireAuth, optionalAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { ok, Errors } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { shareDesignSchema } from "../validation/schemas.js";

export const shareRouter = Router();

shareRouter.post(
  "/designs/:id/share",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const design = await prisma.design.findUnique({ where: { id: req.params.id! } });
    if (!design || design.ownerId !== req.userId) throw Errors.notFound("Design not found.");

    const input = shareDesignSchema.parse(req.body);
    const share = await prisma.sharedDesign.upsert({
      where: { id: `${design.id}-primary` }, // one primary share link per design for the MVP
      create: { id: `${design.id}-primary`, designId: design.id, visibility: input.visibility, token: randomUUID() },
      update: { visibility: input.visibility },
    });
    return ok(res, { token: share.token, visibility: share.visibility, url: `/design/${share.token}` });
  })
);

// Public endpoint — intentionally returns only what's safe to show a stranger:
// no owner email, no account info, no internal ids beyond the opaque share token.
shareRouter.get(
  "/shared/:token",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const share = await prisma.sharedDesign.findUnique({ where: { token: req.params.token! }, include: { design: true } });
    if (!share || share.visibility === "PRIVATE") throw Errors.notFound("This design isn't available.");

    return ok(res, {
      name: share.design.name,
      width: share.design.width,
      height: share.design.height,
      document: share.design.document,
      thumbnailUrl: share.design.thumbnailUrl,
    });
  })
);
