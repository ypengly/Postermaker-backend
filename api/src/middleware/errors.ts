import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError, Errors, fail } from "../lib/http.js";

// Wraps an async route handler so thrown/rejected errors reach the error middleware
// instead of crashing the process or hanging the request.
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return fail(res, err);
  }
  // Never leak raw error/database messages to the client.
  // eslint-disable-next-line no-console
  console.error("[unhandled]", err);
  return fail(res, Errors.internal());
}
