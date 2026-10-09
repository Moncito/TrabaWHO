import { NavButton, Note, Screen } from "@/components/Screen";

// TODO(SWE): GET /bookings/open + cached accepted jobs (W01).
export default function Jobs() {
  return (
    <Screen title="Mga trabaho">
      <Note>Open jobs near you appear here.</Note>
      <NavButton href={{ pathname: "/job/[id]", params: { id: "demo" } }} label="Demo job" />
    </Screen>
  );
}
