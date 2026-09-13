import { randomUUID } from "node:crypto";
import type { Design } from "@prisma/client";
import { redis } from "../lib/redis.js";

interface ExportOptions {
  format: "png" | "jpg" | "pdf" | "svg";
  resolution: "standard" | "high";
  transparent: boolean;
  quality: number;
}

// Rendering full-resolution PNG/PDF exports is CPU-bound and shouldn't block the API's event loop.
// We push a job onto a Redis list; a separate worker process (not shown — same repo, `npm run worker`)
// picks it up with a headless-canvas/PDF renderer, uploads the result to S3, and marks the job done.
// The client polls GET /api/exports/:jobId or subscribes over a websocket in production.
export async function enqueueExportJob(input: { design: Design; options: ExportOptions; addBranding: boolean }) {
  const jobId = randomUUID();
  const job = {
    id: jobId,
    designId: input.design.id,
    status: "queued" as const,
    options: input.options,
    addBranding: input.addBranding,
    createdAt: Date.now(),
  };
  await redis.set(`export:${jobId}`, JSON.stringify(job), "EX", 60 * 30);
  await redis.lpush("export:queue", jobId);
  return { jobId, status: job.status };
}

export async function getExportJob(jobId: string) {
  const raw = await redis.get(`export:${jobId}`);
  return raw ? JSON.parse(raw) : null;
}
