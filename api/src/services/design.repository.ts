import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const designRepository = {
  findById: (id: string) => prisma.design.findUnique({ where: { id } }),

  listForUser: (ownerId: string, opts: { trashed?: boolean; favorite?: boolean } = {}) =>
    prisma.design.findMany({
      where: { ownerId, trashedAt: opts.trashed ? { not: null } : null, ...(opts.favorite ? { favorite: true } : {}) },
      orderBy: { updatedAt: "desc" },
    }),

  // Unchecked input lets callers pass raw foreign keys (ownerId, templateId, folderId)
  // instead of nested `connect` objects — simpler call sites in design.service.ts.
  create: (data: Prisma.DesignUncheckedCreateInput) => prisma.design.create({ data }),

  update: (id: string, data: Prisma.DesignUncheckedUpdateInput) => prisma.design.update({ where: { id }, data }),

  softDelete: (id: string) => prisma.design.update({ where: { id }, data: { trashedAt: new Date() } }),

  restore: (id: string) => prisma.design.update({ where: { id }, data: { trashedAt: null } }),

  createVersion: (designId: string, document: unknown, label: string) =>
    prisma.designVersion.create({ data: { designId, document: document as Prisma.InputJsonValue, label } }),

  listVersions: (designId: string) =>
    prisma.designVersion.findMany({ where: { designId }, orderBy: { createdAt: "desc" }, take: 20 }),
};
