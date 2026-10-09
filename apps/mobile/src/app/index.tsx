import { Redirect } from "expo-router";

import { modelInstalled } from "@/ai";
import { kvGet } from "@/data/db";
import { useGuest, useSession } from "@/data/session";

export default function Index() {
  const user = useSession();
  const guest = useGuest();
  if (!user && !guest) return <Redirect href="/welcome" />;
  // First run on a phone without the on-device model: offer the one-time download (skippable).
  if (!modelInstalled() && !kvGet<boolean>("modelSetupSkipped")) return <Redirect href="/model-setup" />;
  // Guests (no account, no server) go straight to the AI intake.
  return <Redirect href={user?.role === "WORKER" ? "/jobs" : "/new-problem"} />;
}
