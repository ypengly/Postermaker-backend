import type { Prisma } from "@prisma/client";
import { designRepository } from "./design.repository.js";
import { Errors } from "../lib/http.js";
import { assertCanCreateDesign, assertFeature } from "./plan.service.js";

async function assertOwnership(designId: string, userId: string) {
  const design = await designRepository.findById(designId);
  if (!design) throw Errors.notFound("Design not found.");
  if (design.ownerId !== userId) throw Errors.forbidden("You don't have access to this design.");
  return design;
}

export const designService = {
  async list(userId: string, filter: { trashed?: boolean; favorite?: boolean }) {
    return designRepository.listForUser(userId, filter);
  },

  async get(userId: string, designId: string) {
    return assertOwnership(designId, userId);
  },

  async create(userId: string, input: { name: string; formatId: string; formatName: string; width: number; height: number; templateId?: string }) {
    await assertCanCreateDesign(userId);
    return designRepository.create({
      name: input.name,
      formatId: input.formatId,
      formatName: input.formatName,
      width: input.width,
      height: input.height,
      ownerId: userId,
      templateId: input.templateId,
      document: { elements: [], background: { type: "solid", color: "#FFFFFF" } },
    });
  },

  async update(userId: string, designId: string, patch: Prisma.DesignUncheckedUpdateInput & { document?: unknown }) {
    await assertOwnership(designId, userId);
    const updated = await designRepository.update(designId, patch as Prisma.DesignUncheckedUpdateInput);
    // Every save is also a lightweight checkpoint; version history pruning happens on a schedule, not per-write.
    if (patch.document) {
      await designRepository.createVersion(designId, patch.document, "Autosave");
    }
    return updated;
  },

  async duplicate(userId: string, designId: string) {
    const original = await assertOwnership(designId, userId);
    await assertCanCreateDesign(userId);
    return designRepository.create({
      name: `${original.name} copy`,
      formatId: original.formatId,
      formatName: original.formatName,
      width: original.width,
      height: original.height,
      ownerId: userId,
      document: original.document as Prisma.InputJsonValue,
    });
  },

  async trash(userId: string, designId: string) {
    await assertOwnership(designId, userId);
    return designRepository.softDelete(designId);
  },

  async restore(userId: string, designId: string) {
    await assertOwnership(designId, userId);
    await assertCanCreateDesign(userId);
    return designRepository.restore(designId);
  },

  async listVersions(userId: string, designId: string) {
    await assertOwnership(designId, userId);
    await assertFeature(userId, "versionHistory");
    return designRepository.listVersions(designId);
  },
};
