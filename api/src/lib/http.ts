import type { Response } from "express";

export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  unauthorized: (msg = "You need to be signed in to do that.") => new AppError(401, "UNAUTHORIZED", msg),
  forbidden: (msg = "You don't have permission to do that.") => new AppError(403, "FORBIDDEN", msg),
  notFound: (msg = "We couldn't find that.") => new AppError(404, "NOT_FOUND", msg),
  validation: (msg = "Some of the information provided isn't valid.") => new AppError(422, "VALIDATION_ERROR", msg),
  conflict: (msg = "That already exists.") => new AppError(409, "CONFLICT", msg),
  planLimit: (msg = "You've reached a limit on your current plan.") => new AppError(402, "PLAN_LIMIT", msg),
  rateLimited: (msg = "Too many requests — please slow down.") => new AppError(429, "RATE_LIMITED", msg),
  internal: (msg = "Something went wrong on our end.") => new AppError(500, "INTERNAL_ERROR", msg),
};

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function fail(res: Response, err: AppError) {
  return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
}
