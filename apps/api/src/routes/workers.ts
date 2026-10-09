import { Router } from "express";
import { optionalAuth } from "../auth";
import { prisma } from "../db";

export const workers = Router();

// Public worker profile. Contact details only for a client whose booking this worker took.
workers.get("/:id", optionalAuth, async (req, res) => {
  const id = String(req.params.id);
  const w = await prisma.user.findUnique({ where: { id } }).catch(() => null);
  if (!w || w.role !== "WORKER") return res.status(404).json({ error: "Worker not found" });

  const [jobsCompleted, sharedBooking] = await Promise.all([
    prisma.booking.count({ where: { workerId: w.id, status: "COMPLETED" } }),
    req.user
      ? prisma.booking.findFirst({
          where: { workerId: w.id, clientId: req.user.id, status: { in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"] } },
          select: { id: true },
        })
      : null,
  ]);

  res.json({
    id: w.id,
    name: w.name,
    services: w.services,
    city: w.city,
    barangay: w.barangay,
    bio: w.bio,
    yearsExperience: w.yearsExperience,
    isVerified: w.isVerified,
    jobsCompleted,
    memberSince: w.createdAt.toISOString(),
    ...(sharedBooking || req.user?.id === w.id ? { phone: w.phone } : {}),
  });
});
