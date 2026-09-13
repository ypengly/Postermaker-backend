import { Router } from "express";
import { loginSchema, registerSchema } from "../validation/schemas.js";
import { loginUser, registerUser, rotateAccessToken } from "../services/auth.service.js";
import { asyncHandler } from "../middleware/errors.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { ok } from "../lib/http.js";
import { Errors } from "../lib/http.js";

export const authRouter = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

authRouter.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await registerUser(input.email, input.password, input.name);
    res.cookie("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return ok(res, { user, accessToken }, 201);
  })
);

authRouter.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await loginUser(input.email, input.password);
    res.cookie("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return ok(res, { user, accessToken });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refresh_token;
    if (!token) throw Errors.unauthorized();
    const accessToken = rotateAccessToken(token);
    return ok(res, { accessToken });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie("refresh_token", COOKIE_OPTS);
    return ok(res, { loggedOut: true });
  })
);
