import { catalog, ProfileUpdate, type ServiceCode } from "@trabawho/shared";
import { Redirect, router } from "expo-router";
import { CaretRight, CheckCircle, Cpu, FirstAidKit, FloppyDisk, IdentificationCard, PencilSimple, SealCheck, ShieldCheck, SignOut, type Icon } from "phosphor-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Note, Screen } from "@/components/Screen";
import { Avatar, Button, C, Card, Field, InfoRows, Label, ServiceTile, serviceNameEn } from "@/components/ui";
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
      showToast("synced", "Profile saved");
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
        title="Edit profile"
        back
        footer={
          <>
            <Button label="Save changes" icon={FloppyDisk} loading={busy} disabled={!online} disabledReason={!online ? "Needs internet to save." : undefined} onPress={save} />
            <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
          </>
        }
      >
        <Field label="Full name" value={form.name} onChangeText={set("name")} />
        <Field label="Phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" />
        <Field label="Barangay" value={form.barangay} onChangeText={set("barangay")} />
        {isWorker ? (
          <>
            <Label>Services</Label>
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
                      <Text className="flex-1 font-body-bold text-[17px] text-ink">{s.nameEn}</Text>
                      {on ? <CheckCircle size={26} color={C.navy} weight="fill" /> : <CheckCircle size={26} color={C.subtle} />}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
            <Field label="Years of experience" value={form.years} onChangeText={(t) => set("years")(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" />
            <Field label="Short bio" value={form.bio} onChangeText={set("bio")} multiline maxLength={300} />
          </>
        ) : null}
        {error ? <Note>{error}</Note> : null}
      </Screen>
    );
  }

  return (
    <Screen title="My profile" subtitle={isWorker ? "Worker account" : "Client account"} back footer={<Button label="Edit profile" icon={PencilSimple} variant="dark" onPress={startEdit} />}>
      <Animated.View entering={FadeInDown.duration(250)} className="items-center gap-2 rounded-3xl bg-navy px-4 pb-5 pt-6">
        <Avatar name={user.name} size={76} tone="amber" />
        <Text className="pt-1 text-center font-headline text-[22px] leading-[26px] text-white">{user.name}</Text>
        <Text className="font-body text-[13px] text-haze">{user.email}</Text>
        <View className="flex-row flex-wrap justify-center gap-2 pt-1">
          <View className="rounded-full bg-white/10 px-3 py-1">
            <Text className="font-body-bold text-[11px] uppercase tracking-wide text-white">{isWorker ? "Worker" : "Client"}</Text>
          </View>
          {user.isVerified ? (
            <View className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1">
              <SealCheck size={13} color={C.navy} weight="fill" />
              <Text className="font-body-bold text-[11px] uppercase tracking-wide text-navy">Verified</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>

      <InfoRows
        rows={[
          { label: "Phone", value: user.phone },
          { label: "Area", value: `${user.barangay}, ${user.city}` },
          ...(isWorker
            ? [
                { label: "Services", value: user.services.map(serviceNameEn).join(", ") || "None yet" },
                { label: "Experience", value: `${user.yearsExperience} year${user.yearsExperience === 1 ? "" : "s"}` },
              ]
            : []),
        ]}
      />
      {isWorker && user.bio ? (
        <View className="gap-1 rounded-3xl border border-border bg-surface p-4">
          <Label>About me</Label>
          <Text className="font-body text-[15px] leading-[22px] text-ink">{user.bio}</Text>
        </View>
      ) : null}
      {isWorker && !user.isVerified ? <Note>Not verified yet. The TrabaWHO team verifies workers after checking an ID.</Note> : null}
      {pending ? <Note>{`${pending} item${pending > 1 ? "s" : ""} not sent yet. If you log out, they send the next time you log in.`}</Note> : null}

      <View className="overflow-hidden rounded-3xl border border-border bg-surface">
        {isWorker ? <MenuRow icon={IdentificationCard} label="View my public profile" first onPress={() => router.push({ pathname: "/worker/[id]", params: { id: user.id } })} /> : null}
        <MenuRow icon={FirstAidKit} label="While you wait · first aid" onPress={() => router.push("/first-aid")} first={!isWorker} />
        <MenuRow icon={ShieldCheck} label="Check a message for scams" onPress={() => router.push("/scam-check")} />
        <MenuRow icon={Cpu} label="AI on this phone" onPress={() => router.push("/ai-stats")} />
        <MenuRow icon={SignOut} label="Log out" danger onPress={logout} />
      </View>
    </Screen>
  );
}

function MenuRow({ icon: I, label, onPress, danger, first }: { icon: Icon; label: string; onPress: () => void; danger?: boolean; first?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={`flex-row items-center gap-3 px-4 py-[14px] active:bg-soft ${first ? "" : "border-t border-border"}`}>
      <View className={`h-9 w-9 items-center justify-center rounded-xl ${danger ? "bg-danger-bg" : "bg-info-bg"}`}>
        <I size={18} color={danger ? C.danger : C.navy} weight="bold" />
      </View>
      <Text className={`flex-1 font-body-bold text-[15px] ${danger ? "text-danger-ink" : "text-ink"}`}>{label}</Text>
      {danger ? null : <CaretRight size={16} color={C.subtle} weight="bold" />}
    </Pressable>
  );
}
