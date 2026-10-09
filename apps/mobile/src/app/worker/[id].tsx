import type { WorkerProfile } from "@trabawho/shared";
import { useLocalSearchParams } from "expo-router";
import { Briefcase, MapPin } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Note, Screen } from "@/components/Screen";
import { Button, C, call, Card, Label, ServiceTile, serviceName, VerifiedBadge } from "@/components/ui";
import { authErrorText, fetchWorker } from "@/data/auth";
import { kvGet, kvSet } from "@/data/db";
import { useNetwork } from "@/data/sync";

/** Public worker profile. Cached per worker so it still opens offline after one view. */
export default function WorkerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { online } = useNetwork();
  const key = `worker:${id}`;
  const [w, setW] = useState<WorkerProfile | null>(() => kvGet<WorkerProfile>(key));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!online || !id) return;
    fetchWorker(id)
      .then((p) => {
        kvSet(key, p);
        setW(p);
        setError(null);
      })
      .catch((e) => setError(authErrorText(e)));
  }, [id, online, key]);

  if (!w) {
    return (
      <Screen title="Worker" back>
        {error ? <Note>{error}</Note> : !online ? <Note>Offline. Kailangan ng internet para makita ang profile na ito.</Note> : <ActivityIndicator color={C.navy} />}
      </Screen>
    );
  }

  return (
    <Screen title={w.name} subtitle={w.services.map(serviceName).join(" · ")} back>
      <Card>
        <View className="flex-row items-center gap-3">
          {w.services[0] ? <ServiceTile service={w.services[0]} /> : null}
          <View className="flex-1 gap-1">
            <Text className="font-body-bold text-[17px] text-ink">{w.name}</Text>
            {w.isVerified ? <VerifiedBadge /> : null}
            <View className="flex-row items-center gap-1">
              <MapPin size={14} color={C.muted} />
              <Text className="font-body text-[13px] text-muted">
                {w.barangay}, {w.city}
              </Text>
            </View>
          </View>
        </View>
      </Card>
      <Card>
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1">
            <Label>Karanasan</Label>
            <Text className="font-headline text-[26px] text-navy">{w.yearsExperience} taon</Text>
          </View>
          <View className="flex-1 gap-1">
            <Label>Natapos na trabaho</Label>
            <View className="flex-row items-center gap-2">
              <Briefcase size={22} color={C.navy} weight="bold" />
              <Text className="font-headline text-[26px] text-navy">{w.jobsCompleted}</Text>
            </View>
          </View>
        </View>
        <Label>Mga serbisyo</Label>
        <Text className="font-body text-[15px] text-ink">{w.services.map(serviceName).join(" · ")}</Text>
        {w.bio ? (
          <>
            <Label>Tungkol</Label>
            <Text className="font-body text-[15px] leading-[22px] text-ink">{w.bio}</Text>
          </>
        ) : null}
        <Text className="font-body text-xs text-subtle">Member since {new Date(w.memberSince).toLocaleDateString("en-PH", { year: "numeric", month: "short" })}</Text>
      </Card>
      {w.phone ? <Button label={`Tawagan si ${w.name.split(" ")[0]}`} variant="dark" onPress={() => call(w.phone!)} /> : null}
    </Screen>
  );
}
