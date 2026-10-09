import type { AuthResponse, ProfileUpdate, PublicUser, SignupRequest, WorkerProfile } from "@trabawho/shared";

import { api, ApiError, API_URL } from "./api";
import { startSession, updateSessionUser } from "./session";
import { flush } from "./sync";

export async function login(email: string, password: string): Promise<PublicUser> {
  const r = await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
  startSession(r.token, r.user);
  void flush(); // send this user's queued offline items, if any
  return r.user;
}

export async function signup(body: SignupRequest): Promise<PublicUser> {
  const r = await api<AuthResponse>("/auth/signup", { method: "POST", body });
  startSession(r.token, r.user);
  return r.user;
}

export async function fetchMe(): Promise<PublicUser> {
  const u = await api<PublicUser>("/me");
  updateSessionUser(u);
  return u;
}

export async function updateMe(patch: ProfileUpdate): Promise<PublicUser> {
  const u = await api<PublicUser>("/me", { method: "PATCH", body: patch });
  updateSessionUser(u);
  return u;
}

export function fetchWorker(id: string): Promise<WorkerProfile> {
  return api<WorkerProfile>(`/workers/${encodeURIComponent(id)}`);
}

/** User-facing text for a failed auth/profile call. */
export function authErrorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return `Kailangan ng internet para dito. Hindi maabot ang server (${API_URL}).`;
}
