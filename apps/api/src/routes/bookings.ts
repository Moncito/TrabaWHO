import { Prisma } from "@prisma/client";
import { BookingCreate, ReportCreate, computeReportTotals, estimateForTask } from "@trabawho/shared";
import { Router } from "express";
import { requireRole } from "../auth";
import { prisma } from "../db";

export const bookings = Router();

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

const withPeople = {
  client: { select: { id: true, name: true, phone: true } },
  worker: { select: { id: true, name: true, phone: true } },
  report: true,
} as const;

// Create booking. Idempotent on clientRef: offline outbox retries return the same record.
bookings.post("/", requireRole("CLIENT"), async (req, res) => {
  const parsed = BookingCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const b = parsed.data;

  const existing = await prisma.booking.findUnique({ where: { clientRef: b.clientRef }, include: withPeople });
  if (existing) return res.json(existing);

  // Server is the source of truth for prices: recompute from the shared catalog.
  const { priceMin, priceMax } = estimateForTask(b.taskCode);
  try {
    const created = await prisma.booking.create({
      data: { ...b, clientId: req.user!.id, priceMin, priceMax },
      include: withPeople,
    });
    res.status(201).json(created);
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    res.json(await prisma.booking.findUnique({ where: { clientRef: b.clientRef }, include: withPeople }));
  }
});

bookings.get("/mine", async (req, res) => {
  const me = req.user!;
  const where = me.role === "CLIENT" ? { clientId: me.id } : { workerId: me.id };
  res.json(await prisma.booking.findMany({ where, include: withPeople, orderBy: { createdAt: "desc" }, take: 50 }));
});

// Matching (MVP): same city, worker offers the service.
bookings.get("/open", requireRole("WORKER"), async (req, res) => {
  const me = req.user!;
  res.json(
    await prisma.booking.findMany({
      where: { status: "REQUESTED", workerId: null, city: me.city, serviceCode: { in: me.services } },
      include: withPeople,
      orderBy: [{ urgency: "asc" }, { createdAt: "asc" }],
    }),
  );
});

// First-accept-wins: conditional update so two workers can't both win.
bookings.post("/:id/accept", requireRole("WORKER"), async (req, res) => {
  const result = await prisma.booking.updateMany({
    where: { id: String(req.params.id), status: "REQUESTED", workerId: null },
    data: { status: "ACCEPTED", workerId: req.user!.id },
  });
  if (result.count === 0) return res.status(409).json({ error: "Already taken" });
  res.json(await prisma.booking.findUnique({ where: { id: String(req.params.id) }, include: withPeople }));
});

bookings.post("/:id/start", requireRole("WORKER"), async (req, res) => {
  const result = await prisma.booking.updateMany({
    where: { id: String(req.params.id), status: "ACCEPTED", workerId: req.user!.id },
    data: { status: "IN_PROGRESS" },
  });
  if (result.count === 0) return res.status(409).json({ error: "Not your accepted booking" });
  res.json(await prisma.booking.findUnique({ where: { id: String(req.params.id) }, include: withPeople }));
});

// Report: idempotent on clientRef; marks booking COMPLETED. Totals recomputed server-side.
bookings.post("/:id/report", requireRole("WORKER"), async (req, res) => {
  const parsed = ReportCreate.safeParse({ ...req.body, bookingId: String(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const r = parsed.data;

  const existing = await prisma.jobReport.findUnique({ where: { clientRef: r.clientRef } });
  if (existing) return res.json(existing);

  const booking = await prisma.booking.findUnique({ where: { id: r.bookingId } });
  if (!booking || booking.workerId !== req.user!.id) return res.status(404).json({ error: "Booking not found" });
  if (!["ACCEPTED", "IN_PROGRESS"].includes(booking.status)) {
    return res.status(409).json({ error: `Booking is ${booking.status}` });
  }

  const totals = computeReportTotals(r.tasksDone, r.materials);
  try {
    const [report] = await prisma.$transaction([
      prisma.jobReport.create({ data: { ...r, ...totals } }),
      prisma.booking.update({ where: { id: r.bookingId }, data: { status: "COMPLETED" } }),
    ]);
    res.status(201).json(report);
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    res.json(await prisma.jobReport.findUnique({ where: { bookingId: r.bookingId } }));
  }
});
