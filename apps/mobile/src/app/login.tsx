import { router } from "expo-router";
import { CaretRight, Cpu, UserCircle } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { C, Card, Label, ServiceTile, VerifiedBadge, serviceName } from "@/components/ui";
import { HeaderLink, Note, Screen } from "@/components/Screen";
import { api, API_URL, type DemoUser } from "@/data/api";
import { kvGet, kvSet } from "@/data/db";
import { setUser } from "@/data/session";

/** C01: demo account switcher. Users come from GET /users and are cached for offline. */
export default function Login() {
  const [users, setUsers] = useState<DemoUser[]>(() => kvGet<DemoUser[]>("users") ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DemoUser[]>("/users")
      .then((u) => {
        kvSet("users", u);
        setUsers(u);
        setError(null);
      })
      .catch(() => setError(`Hindi maabot ang server (${API_URL}).`));
  }, []);

  function pick(u: DemoUser) {
    setUser(u);
    router.replace(u.role === "CLIENT" ? "/new-problem" : "/jobs");
  }

  const clients = users.filter((u) => u.role === "CLIENT");
  const workers = users.filter((u) => u.role === "WORKER");

  return (
    <Screen
      title="TrabaWho"
      subtitle="Demo: pumili ng account"
      right={
        <HeaderLink href="/ai-stats" label="AI stats">
          <Cpu size={24} color={C.lime} weight="bold" />
        </HeaderLink>
      }
    >
      {error ? <Note>{users.length ? `${error} Naka-cache na listahan ang gamit.` : `${error} Kailangan ng internet sa unang login.`}</Note> : null}
      {clients.length ? <Label>Client</Label> : null}
      {clients.map((u) => (
        <Row key={u.id} onPress={() => pick(u)} title={u.name} subtitle={`${u.barangay}, ${u.city}`} />
      ))}
      {workers.length ? <Label>Worker</Label> : null}
      {workers.map((u) => (
        <Row
          key={u.id}
          onPress={() => pick(u)}
          title={u.name}
          subtitle={u.services.map(serviceName).join(" · ")}
          service={u.services[0]}
          verified={u.isVerified}
        />
      ))}
      <Text className="pt-2 text-center font-body text-xs text-subtle">Demo-only login: walang password.</Text>
    </Screen>
  );
}

function Row({ title, subtitle, onPress, service, verified }: { title: string; subtitle: string; onPress: () => void; service?: DemoUser["services"][number]; verified?: boolean }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Card>
        <View className="flex-row items-center gap-3">
          {service ? (
            <ServiceTile service={service} />
          ) : (
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-soft">
              <UserCircle size={26} color={C.ink} />
            </View>
          )}
          <View className="flex-1 gap-1">
            <Text className="font-body-bold text-[17px] text-ink">{title}</Text>
            <Text className="font-body text-[13px] text-muted">{subtitle}</Text>
            {verified ? <VerifiedBadge /> : null}
          </View>
          <CaretRight size={20} color={C.subtle} />
        </View>
      </Card>
    </Pressable>
  );
}
