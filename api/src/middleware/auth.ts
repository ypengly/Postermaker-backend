import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Errors, fail } from "../lib/http.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.access_token;

  if (!token) return fail(res, Errors.unauthorized());

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not configured");
    const payload = jwt.verify(token, secret) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    return fail(res, Errors.unauthorized("Your session has expired — please sign in again."));
  }
}

// Attaches userId if a valid token is present, but never rejects the request.
// Used for endpoints like public design previews that behave differently when the viewer is signed in.
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.access_token;
  if (!token) return next();
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) return next();
    const payload = jwt.verify(token, secret) as { sub: string };
    req.userId = payload.sub;
  } catch {
    /* ignore invalid token on optional routes */
  }
  next();
}
