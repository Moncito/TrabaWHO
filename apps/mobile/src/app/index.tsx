import { Redirect } from "expo-router";

import { modelInstalled } from "@/ai";
import { kvGet } from "@/data/db";
import { useSession } from "@/data/session";

export default function Index() {
  const user = useSession();
<<<<<<< HEAD
  if (!user) return <Redirect href="/welcome" />;
=======
  if (!user) return <Redirect href="/login" />;
  // First run on a phone without the on-device model: offer the one-time download (skippable).
  if (!modelInstalled() && !kvGet<boolean>("modelSetupSkipped")) return <Redirect href="/model-setup" />;
>>>>>>> origin/ai/model-download
  return <Redirect href={user.role === "CLIENT" ? "/new-problem" : "/jobs"} />;
}
