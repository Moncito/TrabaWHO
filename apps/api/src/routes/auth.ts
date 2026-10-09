import { Prisma } from "@prisma/client";
import { LoginRequest, ProfileUpdate, SignupRequest } from "@trabawho/shared";
import { Router } from "express";
import { checkPassword, dummyCheck, hashPassword, publicUser, requireAuth, signToken } from "../auth";
import { prisma } from "../db";

export const auth = Router();

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

auth.post("/auth/signup", async (req, res) => {
  const parsed = SignupRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { password, ...data } = parsed.data;

  try {
    // isVerified is never set here: verification is a manual, offline ID check.
    const user = await prisma.user.create({ data: { ...data, passwordHash: await hashPassword(password) } });
    res.status(201).json({ token: await signToken(user.id), user: publicUser(user) });
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    res.status(409).json({ error: "May account na ang email na ito. Mag-log in na lang." });
  }
});

auth.post("/auth/login", async (req, res) => {
  const parsed = LoginRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message (and roughly the same time) for unknown email and wrong password.
  const ok = user ? await checkPassword(password, user.passwordHash) : await dummyCheck(password);
  if (!user || !ok) return res.status(401).json({ error: "Mali ang email o password." });
  res.json({ token: await signToken(user.id), user: publicUser(user) });
});

auth.get("/me", requireAuth, (req, res) => {
  res.json(publicUser(req.user!));
});

auth.patch("/me", requireAuth, async (req, res) => {
  const parsed = ProfileUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { services, ...rest } = parsed.data;
  const me = req.user!;
  const user = await prisma.user.update({
    where: { id: me.id },
    data: { ...rest, ...(services && me.role === "WORKER" ? { services } : {}) },
  });
  res.json(publicUser(user));
});
