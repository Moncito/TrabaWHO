import type { DemoUser } from "./api";
import { kvGet, kvSet, useDbQuery } from "./db";

/** Demo-only session: the picked seeded user, sent as x-user-id. */
export function getUser(): DemoUser | null {
  return kvGet<DemoUser>("session");
}

export function setUser(u: DemoUser | null) {
  kvSet("session", u);
}

export function useSession(): DemoUser | null {
  return useDbQuery(getUser);
}
