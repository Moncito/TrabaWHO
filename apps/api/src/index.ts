import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { demoAuth } from "./auth";
import { prisma } from "./db";
import { bookings } from "./routes/bookings";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Seeded users for the account switcher (no auth: demo mode).
app.get("/users", async (_req, res) => {
  res.json(
    await prisma.user.findMany({
      select: { id: true, role: true, name: true, services: true, city: true, barangay: true, isVerified: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  );
});

app.use("/bookings", demoAuth, bookings);

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
};
app.use(onError);

const port = Number(process.env.PORT ?? 3000);
// 0.0.0.0 so phones on the same Wi-Fi / hotspot can reach the laptop.
app.listen(port, "0.0.0.0", () => console.log(`API on http://0.0.0.0:${port}`));
