import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { prisma } from "../src/lib/prisma.js";

describe("Designs", () => {
  const email = `designs-${Date.now()}@example.com`;
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send({ email, password: "correcthorsebattery", name: "Design Tester" });
    accessToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.design.deleteMany({ where: { owner: { email } } });
    await prisma.subscription.deleteMany({ where: { user: { email } } });
    await prisma.brandKit.deleteMany({ where: { owner: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("creates a design", async () => {
    const res = await request(app)
      .post("/api/designs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test Poster", formatId: "ig-post", formatName: "Instagram Post", width: 1080, height: 1080 });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Test Poster");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/designs");
    expect(res.status).toBe(401);
  });

  it("enforces the free-plan active design limit", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/designs")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: `Poster ${i}`, formatId: "ig-post", formatName: "Instagram Post", width: 1080, height: 1080 });
    }
    const res = await request(app)
      .post("/api/designs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "One too many", formatId: "ig-post", formatName: "Instagram Post", width: 1080, height: 1080 });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("PLAN_LIMIT");
  });
});
