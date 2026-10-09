import type { User } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * DEMO-ONLY auth: the app sends the seeded user's id in `x-user-id`.
 * Anyone can impersonate anyone. Never ship this outside the hackathon demo.
 */
export async function demoAuth(req: Request, res: Response, next: NextFunction) {
  const id = req.header("x-user-id");
  const user = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (!user) return res.status(401).json({ error: "Unknown x-user-id" });
  req.user = user;
  next();
}

export function requireRole(role: User["role"]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) return res.status(403).json({ error: `${role} only` });
    next();
  };
}
