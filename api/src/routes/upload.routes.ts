import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { ok, Errors } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { uploadToS3, deleteFromS3 } from "../services/storage.service.js";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(Errors.validation("Only PNG, JPG, WEBP, or SVG images are allowed."));
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

uploadRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.file) throw Errors.validation("No file was provided.");

    const key = `uploads/${req.userId}/${randomUUID()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const url = await uploadToS3(key, req.file.buffer, req.file.mimetype);

    const record = await prisma.upload.create({
      data: {
        ownerId: req.userId!,
        url,
        key,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });

    return ok(res, record, 201);
  })
);

uploadRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const upload = await prisma.upload.findUnique({ where: { id: req.params.id! } });
    if (!upload) throw Errors.notFound("Upload not found.");
    if (upload.ownerId !== req.userId) throw Errors.forbidden();

    await deleteFromS3(upload.key);
    await prisma.upload.delete({ where: { id: upload.id } });
    return ok(res, { deleted: true });
  })
);
