import { safetyFor } from "@trabawho/shared";
import { router } from "expo-router";
import { Briefcase, CaretRight, Handshake, MapPin, WifiSlash } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AccountButtons } from "@/components/AccountButtons";
import { Screen } from "@/components/Screen";
import { Button, C, Card, EmptyState, HazardAlert, peso, ServiceTile, serviceName, StatusBadge, taskName, UrgencyBadge } from "@/components/ui";
import { api, ApiError, type ServerBooking } from "@/data/api";
import { cacheBookings, pendingReportFor, refreshMine, useCachedBookings, useOutbox } from "@/data/bookings";
import { useSession } from "@/data/session";
import { useNetwork, usePolling } from "@/data/sync";
import { showToast } from "@/state/toast";

/** W01: Bukas (open jobs, online only) / Akin (my accepted jobs, cached). */
export default function Jobs() {
  const user = useSession();
  const { online } = useNetwork();
  const [tab, setTab] = useState<"open" | "mine">("open");
  const [open, setOpen] = useState<ServerBooking[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const outbox = useOutbox();
  const mine = useCachedBookings().filter((b) => b.workerId === user?.id);

  const loadOpen = async () => {
    if (!user) return;
    const list = await api<ServerBooking[]>("/bookings/open");
    cacheBookings(list); // so job detail works from the cache
    setOpen(list);
  };
  usePolling(() => Promise.all([loadOpen(), user ? refreshMine() : null]), online && !!user);

  async function accept(b: ServerBooking) {
    if (!user) return;
    setAccepting(b.id);
    try {
      cacheBookings([await api<ServerBooking>(`/bookings/${b.id}/accept`, { method: "POST" })]);
      router.push({ pathname: "/job/[id]", params: { id: b.id } });
    } catch (e) {
      showToast("error", e instanceof ApiError && e.status === 409 ? "Nakuha na ng ibang worker" : "Hindi ma-accept. Subukan ulit.");
      await loadOpen().catch(() => undefined);
    } finally {
      setAccepting(null);
    }
  }

  return (
    <Screen title="Open jobs" subtitle={user ? `${user.name} · ${user.services.map(serviceName).join(", ")}` : undefined} right={<AccountButtons />}>
      <View className="flex-row rounded-full border border-border bg-surface p-1">
        {(["open", "mine"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className={`h-11 flex-1 items-center justify-center rounded-full ${tab === t ? "bg-navy" : ""}`}>
            <Text className={`font-body-bold text-sm ${tab === t ? "text-white" : "text-muted"}`}>{t === "open" ? "Open" : `Mine (${mine.length})`}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "open" ? (
        !online ? (
          <EmptyState icon={WifiSlash} title="Kailangan ng internet" hint="Para makita at tanggapin ang bagong trabaho. Makikita mo pa rin ang Akin." />
        ) : open.length === 0 ? (
          <EmptyState icon={Briefcase} title="Walang bukas na trabaho" hint="Nire-refresh kada 5 segundo." />
        ) : (
          open.map((b) => (
            <Card key={b.id}>
              <JobSummary b={b} />
              <HazardAlert notes={safetyFor(b.hazards).safetyNotes} compact />
              <Text className="font-body text-[13px] text-muted">{b.aiSummary}</Text>
              <Button label="Accept job" icon={Handshake} loading={accepting === b.id} onPress={() => accept(b)} />
            </Card>
          ))
        )
      ) : mine.length === 0 ? (
        <EmptyState icon={Briefcase} title="Wala ka pang tinanggap" />
      ) : (
        mine.map((b) => (
          <Pressable key={b.id} onPress={() => router.push({ pathname: "/job/[id]", params: { id: b.id } })} className="active:opacity-80">
            <Card>
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <JobSummary b={b} />
                </View>
                <CaretRight size={20} color={C.subtle} />
              </View>
              <View className="flex-row flex-wrap gap-2">
                <StatusBadge status={b.status} />
                {pendingReportFor(outbox, b.id) ? <Text className="self-center font-body-semibold text-xs text-muted">Report: Pending</Text> : null}
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function JobSummary({ b }: { b: ServerBooking }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3">
        <ServiceTile service={b.serviceCode} />
        <View className="flex-1">
          <Text className="font-body-bold text-[15px] text-ink">{taskName(b.taskCode)}</Text>
          <View className="flex-row items-center gap-1">
            <MapPin size={14} color={C.muted} />
            <Text className="font-body text-[13px] text-muted">{b.barangay}</Text>
          </View>
        </View>
        <Text className="font-body-bold text-sm text-navy">
          {peso(b.priceMin)}–{peso(b.priceMax).slice(1)}
        </Text>
      </View>
      <UrgencyBadge urgency={b.urgency} />
    </View>
  );
}
