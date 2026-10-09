import { useLocalSearchParams } from "expo-router";

import { NavButton, Note, Screen } from "@/components/Screen";

// TODO(SWE): Accept / Start / Call (tel:) per W02.
export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen title="Job">
      <Note>Booking {id}</Note>
      <NavButton href={{ pathname: "/report", params: { id } }} label="I-report ang trabaho" />
    </Screen>
  );
}
