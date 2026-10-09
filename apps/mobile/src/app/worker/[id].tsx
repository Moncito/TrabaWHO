import type { WorkerProfile } from "@trabawho/shared";
import { useLocalSearchParams } from "expo-router";
import { Briefcase, Clock, MapPin, Phone, SealCheck, type Icon } from "phosphor-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Note, Screen } from "@/components/Screen";
import { Avatar, Button, C, call, Label, ServiceTile, serviceNameEn, SkeletonCard } from "@/components/ui";
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
        {error ? <Note>{error}</Note> : !online ? <Note>You're offline. This profile needs internet the first time.</Note> : <SkeletonCard />}
      </Screen>
    );
  }

  const since = new Date(w.memberSince).toLocaleDateString("en-PH", { year: "numeric", month: "short" });
  return (
    <Screen
      title={w.name}
      subtitle={w.services.map(serviceNameEn).join(" · ")}
      back
      footer={w.phone ? <Button label={`Call ${w.name.split(" ")[0]}`} icon={Phone} variant="dark" onPress={() => call(w.phone!)} /> : undefined}
    >
      <Animated.View entering={FadeInDown.duration(250)} className="items-center gap-2 rounded-3xl bg-navy px-4 pb-5 pt-6">
        <Avatar name={w.name} size={76} tone="amber" />
        <Text className="pt-1 text-center font-headline text-[22px] leading-[26px] text-white">{w.name}</Text>
        <View className="flex-row items-center gap-1">
          <MapPin size={14} color={C.haze} weight="fill" />
          <Text className="font-body text-[13px] text-haze">
            {w.barangay}, {w.city}
          </Text>
        </View>
        {w.isVerified ? (
          <View className="mt-1 flex-row items-center gap-1 rounded-full bg-white px-3 py-1">
            <SealCheck size={13} color={C.navy} weight="fill" />
            <Text className="font-body-bold text-[11px] uppercase tracking-wide text-navy">Verified by TrabaWHO</Text>
          </View>
        ) : null}
      </Animated.View>

      <View className="flex-row gap-3">
        <Stat icon={Clock} value={`${w.yearsExperience}`} label={w.yearsExperience === 1 ? "Year of experience" : "Years of experience"} />
        <Stat icon={Briefcase} value={`${w.jobsCompleted}`} label="Jobs done on TrabaWHO" />
      </View>

      <View className="gap-3 rounded-3xl border border-border bg-surface p-4">
        <Label>Services</Label>
        <View className="flex-row flex-wrap gap-2">
          {w.services.map((sv) => (
            <View key={sv} className="flex-row items-center gap-2 rounded-full bg-soft py-1 pl-1 pr-3">
              <ServiceTile service={sv} size={28} />
              <Text className="font-body-bold text-[13px] text-ink">{serviceNameEn(sv)}</Text>
            </View>
          ))}
        </View>
        {w.bio ? (
          <>
            <Label>About</Label>
            <Text className="font-body text-[15px] leading-[22px] text-ink">{w.bio}</Text>
          </>
        ) : null}
        <Text className="font-body text-xs text-subtle">Member since {since}</Text>
      </View>
    </Screen>
  );
}

function Stat({ icon: I, value, label }: { icon: Icon; value: string; label: string }) {
  return (
    <View className="flex-1 gap-1 rounded-3xl border border-border bg-surface p-4">
      <I size={20} color={C.lime} weight="fill" />
      <Text className="font-headline text-[28px] leading-[32px] text-navy">{value}</Text>
      <Text className="font-body text-xs text-muted">{label}</Text>
    </View>
  );
}
