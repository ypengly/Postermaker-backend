import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errors.js";
import { ok } from "../lib/http.js";
import { optionalAuth, type AuthedRequest } from "../middleware/auth.js";

export const templateRouter = Router();

templateRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const templates = await prisma.template.findMany({
      where: category && category !== "All" ? { category: { name: category } } : undefined,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    // Pro templates are always listed (so free users can see what they're missing) —
    // gating happens when the template is actually used to create a design.
    return ok(res, templates);
  })
);

templateRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const template = await prisma.template.findUniqueOrThrow({ where: { id: req.params.id! }, include: { category: true } });
    return ok(res, template);
  })
);
