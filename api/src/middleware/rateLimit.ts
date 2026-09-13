import rateLimit from "express-rate-limit";

// Generic API rate limit — generous, just enough to blunt scraping/abuse.
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests — please slow down." } },
});

// Tighter limit on auth endpoints to slow down credential stuffing / brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts — please try again later." } },
});

// Export jobs are CPU/IO heavy — limit per-user regardless of overall traffic.
export const exportLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many export requests — please wait a moment." } },
});
