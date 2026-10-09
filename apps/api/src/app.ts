import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { requireAuth } from "./auth";
import { auth } from "./routes/auth";
import { bookings } from "./routes/bookings";
import { workers } from "./routes/workers";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(auth); // /auth/signup, /auth/login, /me
  app.use("/workers", workers);
  app.use("/bookings", requireAuth, bookings);

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    // Malformed JSON bodies are client errors, not server errors.
    if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  };
  app.use(onError);
  return app;
}
