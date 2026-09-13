import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { prisma } from "../src/lib/prisma.js";

// These tests expect a disposable test database (see package.json `test` script / CI config,
// which should point DATABASE_URL at a throwaway Postgres instance before running Prisma migrations).

describe("Auth", () => {
  const email = `test-${Date.now()}@example.com`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers a new user and returns an access token", async () => {
    const res = await request(app).post("/api/auth/register").send({ email, password: "correcthorsebattery", name: "Test User" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(email);
  });

  it("rejects registration with a weak password", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: `weak-${Date.now()}@example.com`, password: "short", name: "Test" });
    expect(res.status).toBe(400);
  });

  it("rejects login with the wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("logs in with the correct password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password: "correcthorsebattery" });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });
});
