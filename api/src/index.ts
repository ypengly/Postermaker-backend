import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { webhookRouter } from "./routes/webhook.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { designRouter } from "./routes/design.routes.js";
import { templateRouter } from "./routes/template.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { brandKitRouter } from "./routes/brandKit.routes.js";
import { favoriteRouter } from "./routes/favorite.routes.js";
import { subscriptionRouter } from "./routes/subscription.routes.js";
import { shareRouter } from "./routes/share.routes.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errors.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);

// Stripe webhooks need the raw body for signature verification, so this is mounted
// BEFORE express.json() and is the only route exempt from the global JSON body parser.
app.use("/api/webhooks", webhookRouter);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(apiLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/designs", designRouter);
app.use("/api/templates", templateRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/brand-kit", brandKitRouter);
app.use("/api/favorites", favoriteRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api", shareRouter); // exposes /api/designs/:id/share and /api/shared/:token

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "That route doesn't exist." } });
});

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`PosterMaker API listening on :${port}`);
});

export { app };
