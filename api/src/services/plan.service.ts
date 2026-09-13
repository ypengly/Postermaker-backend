import type { PlanTier } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { Errors } from "../lib/http.js";

// Central source of truth for freemium gating. The frontend mirrors these for UX only —
// every limit here is re-checked server-side before the corresponding write/export happens.
export const PLAN_LIMITS: Record<PlanTier, {
  maxActiveDesigns: number | null;
  proTemplates: boolean;
  proExportFormats: boolean;
  highResExport: boolean;
  magicResize: boolean;
  backgroundRemoval: boolean;
  versionHistory: boolean;
  brandKit: boolean;
  teamCollaboration: boolean;
  branding: boolean; // whether exports carry PosterMaker branding
}> = {
  FREE: {
    maxActiveDesigns: 5,
    proTemplates: false,
    proExportFormats: false,
    highResExport: false,
    magicResize: false,
    backgroundRemoval: false,
    versionHistory: false,
    brandKit: true,
    teamCollaboration: false,
    branding: true,
  },
  PRO: {
    maxActiveDesigns: null,
    proTemplates: true,
    proExportFormats: true,
    highResExport: true,
    magicResize: true,
    backgroundRemoval: true,
    versionHistory: true,
    brandKit: true,
    teamCollaboration: false,
    branding: false,
  },
  BUSINESS: {
    maxActiveDesigns: null,
    proTemplates: true,
    proExportFormats: true,
    highResExport: true,
    magicResize: true,
    backgroundRemoval: true,
    versionHistory: true,
    brandKit: true,
    teamCollaboration: true,
    branding: false,
  },
};

export async function getUserPlan(userId: string): Promise<PlanTier> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return sub?.plan ?? "FREE";
}

// PLAN_LIMITS is keyed by the full PlanTier enum, so a lookup with a valid PlanTier value
// always hits — this helper centralizes the (safe) non-null assertion in one place.
function limitsFor(plan: PlanTier) {
  const limits = PLAN_LIMITS[plan];
  if (!limits) throw Errors.internal();
  return limits;
}

export async function assertCanCreateDesign(userId: string) {
  const plan = await getUserPlan(userId);
  const limit = limitsFor(plan).maxActiveDesigns;
  if (limit === null) return;
  const count = await prisma.design.count({ where: { ownerId: userId, trashedAt: null } });
  if (count >= limit) {
    throw Errors.planLimit(`Free accounts can keep up to ${limit} active designs. Upgrade to Pro for unlimited designs.`);
  }
}

export async function assertFeature(userId: string, feature: keyof (typeof PLAN_LIMITS)["FREE"]) {
  const plan = await getUserPlan(userId);
  if (!limitsFor(plan)[feature]) {
    throw Errors.planLimit("This feature requires a Pro or Business plan.");
  }
}
