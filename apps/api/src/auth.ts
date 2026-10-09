import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const DEV_SECRET = "trabawho-dev-only-secret-change-me";
const TOKEN_TTL = "30d";
const BCRYPT_COST = 10;

let cachedSecret: Uint8Array | null = null;

/** Called at startup (index.ts) and on first use. Production refuses to run without JWT_SECRET. */
export function jwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const s = process.env.JWT_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production. Set it in apps/api/.env.");
  }
  if (!s && process.env.NODE_ENV !== "test") {
    console.warn("[auth] JWT_SECRET not set: using an insecure dev default. Set JWT_SECRET in apps/api/.env.");
  }
  cachedSecret = new TextEncoder().encode(s || DEV_SECRET);
  return cachedSecret;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_COST);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// Compared against when the email is unknown, so both failure paths cost one bcrypt check.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);
export const dummyCheck = (pw: string) => bcrypt.compare(pw, DUMMY_HASH);

export function signToken(userId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime(TOKEN_TTL).sign(jwtSecret());
}

async function userFromToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ["HS256"] });
    return payload.sub ? await prisma.user.findUnique({ where: { id: payload.sub } }) : null;
  } catch {
    return null;
  }
}

/** Requires `Authorization: Bearer <token>`; sets req.user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const m = /^Bearer\s+(.+)$/i.exec(req.header("authorization") ?? "");
  const user = m ? await userFromToken(m[1]!.trim()) : null;
  if (!user) return res.status(401).json({ error: "Not signed in" });
  req.user = user;
  next();
}

/** Like requireAuth but never rejects: req.user is set only for a valid token. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const m = /^Bearer\s+(.+)$/i.exec(req.header("authorization") ?? "");
  if (m) req.user = (await userFromToken(m[1]!.trim())) ?? undefined;
  next();
}

export function requireRole(role: User["role"]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) return res.status(403).json({ error: `${role} only` });
    next();
  };
}

/** The only shape a user leaves the API in (no password hash). */
export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    name: u.name,
    phone: u.phone,
    services: u.services,
    city: u.city,
    barangay: u.barangay,
    bio: u.bio,
    yearsExperience: u.yearsExperience,
    isVerified: u.isVerified,
    createdAt: u.createdAt.toISOString(),
  };
}
