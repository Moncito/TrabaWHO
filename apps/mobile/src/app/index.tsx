import { Redirect } from "expo-router";

import { useSession } from "@/data/session";

export default function Index() {
  const user = useSession();
  if (!user) return <Redirect href="/welcome" />;
  return <Redirect href={user.role === "CLIENT" ? "/new-problem" : "/jobs"} />;
}
