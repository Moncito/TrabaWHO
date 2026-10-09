import { catalog, ProfileUpdate, type ServiceCode } from "@trabawho/shared";
import { Redirect, router } from "expo-router";
import { CheckCircle, FloppyDisk, PencilSimple, SignOut, UserCircle } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Note, Screen } from "@/components/Screen";
import { Button, C, Card, Field, Label, ServiceTile, serviceName, VerifiedBadge } from "@/components/ui";
import { authErrorText, fetchMe, updateMe } from "@/data/auth";
import { useOutbox } from "@/data/bookings";
import { endSession, useSession } from "@/data/session";
import { useNetwork } from "@/data/sync";
import { showToast } from "@/state/toast";

/** My profile: view (works offline from the cached session), edit (online), log out. */
export default function Profile() {
  const user = useSession();
  const { online } = useNetwork();
  const pending = useOutbox().filter((r) => r.status !== "sent" && r.userId === user?.id).length;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", barangay: "", bio: "", years: "", services: [] as ServiceCode[] });

  useEffect(() => {
    if (online) fetchMe().catch(() => undefined);
  }, [online]);

  if (!user) return <Redirect href="/login" />;
  const isWorker = user.role === "WORKER";

  function startEdit() {
    setForm({ name: user!.name, phone: user!.phone, barangay: user!.barangay, bio: user!.bio, years: String(user!.yearsExperience), services: user!.services });
    setError(null);
    setEditing(true);
  }

  async function save() {
    const patch = {
      name: form.name,
      phone: form.phone,
      barangay: form.barangay,
      ...(isWorker ? { bio: form.bio, yearsExperience: form.years.trim() ? Number(form.years) : 0, services: form.services } : {}),
    };
    const parsed = ProfileUpdate.safeParse(patch);
    if (!parsed.success) {
      const i = parsed.error.issues[0]!;
      return setError(`${String(i.path[0] ?? "")}: ${i.message}`);
    }
    setBusy(true);
    setError(null);
    try {
      await updateMe(patch);
      setEditing(false);
      showToast("synced", "Na-save ang profile");
    } catch (e) {
      setError(authErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    endSession();
    router.replace("/login");
  }

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (editing) {
    return (
      <Screen
        title="I-edit ang profile"
        back
        footer={
          <>
            <Button label="I-save" icon={FloppyDisk} loading={busy} disabled={!online} disabledReason={!online ? "Kailangan ng internet para mag-save." : undefined} onPress={save} />
            <Button label="Kanselahin" variant="ghost" onPress={() => setEditing(false)} />
          </>
        }
      >
        <Field label="Buong pangalan" value={form.name} onChangeText={set("name")} />
        <Field label="Phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" />
        <Field label="Barangay" value={form.barangay} onChangeText={set("barangay")} />
        {isWorker ? (
          <>
            <Label>Mga serbisyo</Label>
            {catalog.services.map((s) => {
              const code = s.code as ServiceCode;
              const on = form.services.includes(code);
              return (
                <Pressable
                  key={code}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => setForm((f) => ({ ...f, services: on ? f.services.filter((x) => x !== code) : [...f.services, code] }))}
                  className="active:opacity-80"
                >
                  <Card>
                    <View className="flex-row items-center gap-3">
                      <ServiceTile service={code} size={40} />
                      <Text className="flex-1 font-body-bold text-[17px] text-ink">{s.nameTl}</Text>
                      {on ? <CheckCircle size={26} color={C.navy} weight="fill" /> : <CheckCircle size={26} color={C.subtle} />}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
            <Field label="Taon ng karanasan" value={form.years} onChangeText={(t) => set("years")(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" />
            <Field label="Maikling bio" value={form.bio} onChangeText={set("bio")} multiline maxLength={300} />
          </>
        ) : null}
        {error ? <Note>{error}</Note> : null}
      </Screen>
    );
  }

  return (
    <Screen
      title="Aking profile"
      subtitle={isWorker ? "Worker" : "Client"}
      back
      footer={
        <>
          <Button label="I-edit ang profile" icon={PencilSimple} variant="dark" onPress={startEdit} />
          <Button label="Mag-log out" icon={SignOut} variant="ghost" onPress={logout} />
        </>
      }
    >
      <Card>
        <View className="flex-row items-center gap-3">
          {isWorker && user.services[0] ? <ServiceTile service={user.services[0]} /> : <UserCircle size={48} color={C.navy} weight="fill" />}
          <View className="flex-1 gap-1">
            <Text className="font-body-bold text-[17px] text-ink">{user.name}</Text>
            <Text className="font-body text-[13px] text-muted">{user.email}</Text>
            {user.isVerified ? <VerifiedBadge /> : null}
          </View>
        </View>
        <Label>Phone</Label>
        <Text className="font-body text-[15px] text-ink">{user.phone}</Text>
        <Label>Lugar</Label>
        <Text className="font-body text-[15px] text-ink">
          {user.barangay}, {user.city}
        </Text>
        {isWorker ? (
          <>
            <Label>Mga serbisyo</Label>
            <Text className="font-body text-[15px] text-ink">{user.services.map(serviceName).join(" · ")}</Text>
            <Label>Karanasan</Label>
            <Text className="font-body text-[15px] text-ink">{user.yearsExperience} taon</Text>
            {user.bio ? (
              <>
                <Label>Bio</Label>
                <Text className="font-body text-[15px] text-ink">{user.bio}</Text>
              </>
            ) : null}
          </>
        ) : null}
      </Card>
      {isWorker ? <Button label="Tingnan ang public profile" variant="ghost" size="sm" onPress={() => router.push({ pathname: "/worker/[id]", params: { id: user.id } })} /> : null}
      {isWorker && !user.isVerified ? <Note>Hindi pa verified. Ang verification ay ginagawa ng TrabaWHO team pagkatapos suriin ang ID.</Note> : null}
      {pending ? <Note>{`May ${pending} item na hindi pa naipapadala. Kung mag-log out ka, ipapadala ito sa susunod mong pag-log in.`}</Note> : null}
    </Screen>
  );
}
