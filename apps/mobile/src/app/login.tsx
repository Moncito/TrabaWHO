import { Screen, NavButton, Note } from "@/components/Screen";

// TODO(SWE): account switcher from GET /users (cache for offline), store selected user id.
export default function Login() {
  return (
    <Screen title="TrabaWho">
      <Note>Demo account switcher. Pick a seeded client or worker.</Note>
      <NavButton href="/new-problem" label="Client: Juan dela Cruz" />
      <NavButton href="/jobs" label="Worker: Mang Ramon (Electrician)" />
    </Screen>
  );
}
