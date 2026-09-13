import argon2 from "argon2";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { Errors } from "../lib/http.js";

function signAccessToken(userId: string) {
  const secret = process.env.JWT_ACCESS_SECRET!;
  const expiresIn = (process.env.JWT_ACCESS_TTL ?? "15m") as SignOptions["expiresIn"];
  return jwt.sign({ sub: userId }, secret, { expiresIn });
}
function signRefreshToken(userId: string) {
  const secret = process.env.JWT_REFRESH_SECRET!;
  const expiresIn = (process.env.JWT_REFRESH_TTL ?? "30d") as SignOptions["expiresIn"];
  return jwt.sign({ sub: userId }, secret, { expiresIn });
}

export async function registerUser(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Errors.conflict("An account with that email already exists.");

  // argon2id: memory-hard, resistant to GPU cracking — the recommended default over bcrypt for new systems.
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.user.create({ data: { email, passwordHash, name } });
    await tx.subscription.create({ data: { userId: created.id, plan: "FREE", status: "ACTIVE" } });
    await tx.brandKit.create({ data: { ownerId: created.id, businessName: name } });
    return created;
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Constant-shape response whether the email exists or not, to avoid user enumeration.
  if (!user) throw Errors.unauthorized("That email or password is incorrect.");

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) throw Errors.unauthorized("That email or password is incorrect.");

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  };
}

export function rotateAccessToken(refreshToken: string) {
  const secret = process.env.JWT_REFRESH_SECRET!;
  try {
    const payload = jwt.verify(refreshToken, secret) as { sub: string };
    return signAccessToken(payload.sub);
  } catch {
    throw Errors.unauthorized("Your session has expired — please sign in again.");
  }
}
