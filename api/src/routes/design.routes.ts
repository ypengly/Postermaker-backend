import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { exportLimiter } from "../middleware/rateLimit.js";
import { ok } from "../lib/http.js";
import { designService } from "../services/design.service.js";
import { createDesignSchema, exportDesignSchema, updateDesignSchema } from "../validation/schemas.js";
import { assertFeature, getUserPlan } from "../services/plan.service.js";
import { enqueueExportJob } from "../services/export.service.js";

export const designRouter = Router();
designRouter.use(requireAuth);

designRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const trashed = req.query.trashed === "true";
    const favorite = req.query.favorite === "true";
    const designs = await designService.list(req.userId!, { trashed, favorite });
    return ok(res, designs);
  })
);

designRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = createDesignSchema.parse(req.body);
    const design = await designService.create(req.userId!, input);
    return ok(res, design, 201);
  })
);

designRouter.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const design = await designService.get(req.userId!, req.params.id!);
    return ok(res, design);
  })
);

designRouter.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = updateDesignSchema.parse(req.body);
    const design = await designService.update(req.userId!, req.params.id!, input);
    return ok(res, design);
  })
);

designRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await designService.trash(req.userId!, req.params.id!);
    return ok(res, { trashed: true });
  })
);

designRouter.post(
  "/:id/restore",
  asyncHandler(async (req: AuthedRequest, res) => {
    const design = await designService.restore(req.userId!, req.params.id!);
    return ok(res, design);
  })
);

designRouter.post(
  "/:id/duplicate",
  asyncHandler(async (req: AuthedRequest, res) => {
    const design = await designService.duplicate(req.userId!, req.params.id!);
    return ok(res, design, 201);
  })
);

designRouter.get(
  "/:id/versions",
  asyncHandler(async (req: AuthedRequest, res) => {
    const versions = await designService.listVersions(req.userId!, req.params.id!);
    return ok(res, versions);
  })
);

// Export runs as a background job (see export.service.ts) so the request returns immediately
// with a job id instead of blocking the API process on image/PDF rendering.
designRouter.post(
  "/:id/export",
  exportLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = exportDesignSchema.parse(req.body);
    const plan = await getUserPlan(req.userId!);
    if (input.format === "pdf" || input.format === "svg") await assertFeature(req.userId!, "proExportFormats");
    if (input.resolution === "high") await assertFeature(req.userId!, "highResExport");
    if (input.transparent) await assertFeature(req.userId!, "highResExport");

    const design = await designService.get(req.userId!, req.params.id!);
    const job = await enqueueExportJob({ design, options: input, addBranding: plan === "FREE" });
    return ok(res, job, 202);
  })
);
