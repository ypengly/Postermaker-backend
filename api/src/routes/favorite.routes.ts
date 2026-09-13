import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { ok, Errors } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";

export const favoriteRouter = Router();
favoriteRouter.use(requireAuth);

favoriteRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const favorites = await prisma.favorite.findMany({ where: { userId: req.userId! }, include: { design: true } });
    return ok(res, favorites);
  })
);

favoriteRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { designId } = z.object({ designId: z.string() }).parse(req.body);
    const design = await prisma.design.findUnique({ where: { id: designId } });
    if (!design || design.ownerId !== req.userId) throw Errors.notFound("Design not found.");

    const favorite = await prisma.favorite.upsert({
      where: { userId_designId: { userId: req.userId!, designId } },
      create: { userId: req.userId!, designId },
      update: {},
    });
    await prisma.design.update({ where: { id: designId }, data: { favorite: true } });
    return ok(res, favorite, 201);
  })
);
