import { safetyFor } from "@trabawho/shared";
import { router, useLocalSearchParams } from "expo-router";
import { CloudArrowUp, Handshake, NotePencil, Play } from "phosphor-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { Note, Screen } from "@/components/Screen";
import { Button, C, Card, HazardAlert, Label, peso, PersonCard, ServiceTile, serviceName, StatusBadge, taskName, TotalsCard, UrgencyBadge } from "@/components/ui";
import { api, ApiError, type ServerBooking } from "@/data/api";
import { cacheBookings, pendingReportFor, refreshMine, useCachedBookings, useOutbox } from "@/data/bookings";
import { useSession } from "@/data/session";
import { useNetwork, usePolling } from "@/data/sync";
import { showToast } from "@/state/toast";

/** W02 job detail (Accept / Start / Call / I-report) and W06 completed receipt. */
export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession();
  const { online } = useNetwork();
  const b = useCachedBookings().find((x) => x.id === id);
  const pending = pendingReportFor(useOutbox(), id);
  const [busy, setBusy] = useState(false);
  usePolling(() => (user ? refreshMine(user.id) : Promise.resolve()), online && !!user);

  if (!b) {
    return (
      <Screen title="Job" back>
        <Note>Hindi makita ang trabahong ito.</Note>
      </Screen>
    );
  }

  async function act(action: "accept" | "start") {
    if (!user || !b) return;
    setBusy(true);
    try {
      cacheBookings([await api<ServerBooking>(`/bookings/${b.id}/${action}`, { method: "POST", userId: user.id })]);
    } catch (e) {
      showToast("error", e instanceof ApiError && e.status === 409 ? "Nakuha na ng ibang worker" : "Hindi natuloy. Subukan ulit.");
    } finally {
      setBusy(false);
    }
  }

  const needNet = "Kailangan ng internet para dito";
  const report = () => router.push({ pathname: "/report", params: { bookingId: b.id } });
  let footer = null;
  if (b.status === "REQUESTED") {
    footer = <Button label="Accept job" icon={Handshake} loading={busy} onPress={() => act("accept")} disabled={!online} disabledReason={needNet} />;
  } else if (pending) {
    footer = (
      <View className="flex-row items-center justify-center gap-2 py-2">
        <CloudArrowUp size={18} color={C.ink} />
        <Text className="font-body-semibold text-sm text-ink">Report: Pending — ipapadala pag may internet</Text>
      </View>
    );
  } else if (b.status === "ACCEPTED") {
    footer = (
      <>
        <Button label="Start the job" icon={Play} variant="dark" loading={busy} onPress={() => act("start")} disabled={!online} disabledReason={needNet} />
        <Button label="Report the job" icon={NotePencil} onPress={report} />
      </>
    );
  } else if (b.status === "IN_PROGRESS") {
    footer = <Button label="Report the job" icon={NotePencil} onPress={report} />;
  }

  return (
    <Screen title={taskName(b.taskCode)} subtitle={serviceName(b.serviceCode)} back footer={footer}>
      <Card>
        <View className="flex-row items-center gap-3">
          <ServiceTile service={b.serviceCode} />
          <View className="flex-1 gap-1">
            <StatusBadge status={b.status} />
            <UrgencyBadge urgency={b.urgency} />
          </View>
          <Text className="font-body-bold text-sm text-ink">
            {peso(b.priceMin)}–{peso(b.priceMax).slice(1)}
          </Text>
        </View>
      </Card>
      <HazardAlert notes={safetyFor(b.hazards).safetyNotes} compact />
      <PersonCard name={b.client.name} role="client" phone={b.client.phone} />
      <Card>
        <Label>Buod ng problema (AI)</Label>
        <Text className="font-body text-[15px] text-ink">{b.aiSummary}</Text>
        <Label>Address</Label>
        <Text className="font-body text-[15px] text-ink">
          {b.address}, {b.barangay}, {b.city}
        </Text>
      </Card>
      {b.report ? (
        <>
          <Card>
            <Label>Ginawa</Label>
            {b.report.tasksDone.map((t) => (
              <Text key={t} className="font-body text-[15px] text-ink">
                • {taskName(t)}
              </Text>
            ))}
            {b.report.materials.map((m, i) => (
              <Text key={i} className="font-body text-[13px] text-muted">
                {m.qty} {m.unit} {m.name} × {peso(m.unitPrice)}
              </Text>
            ))}
            <Text className="font-body text-[13px] text-muted">{b.report.durationMinutes} minuto</Text>
          </Card>
          <TotalsCard {...b.report} />
        </>
      ) : null}
    </Screen>
  );
}
