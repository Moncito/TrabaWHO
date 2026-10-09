import { Note, Screen } from "@/components/Screen";

// TODO(SWE): text -> ai.extractReport() -> materials table, worker prices,
// totals via computeReportTotals() from @trabawho/shared -> outbox (W03–W05).
export default function Report() {
  return (
    <Screen title="I-report ang trabaho">
      <Note>Report form goes here.</Note>
    </Screen>
  );
}
