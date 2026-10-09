import { catalog, SignupRequest, type Role, type ServiceCode } from "@trabawho/shared";
import { router } from "expo-router";
import { Briefcase, CheckCircle, House, UserPlus } from "phosphor-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Note, Screen } from "@/components/Screen";
import { Button, C, Card, Field, Label, ServiceTile } from "@/components/ui";
import { authErrorText, signup } from "@/data/auth";
import { useNetwork } from "@/data/sync";

const FIELD_NAMES: Record<string, string> = {
  email: "Email",
  password: "Password",
  name: "Pangalan",
  phone: "Phone",
  city: "Lungsod",
  barangay: "Barangay",
  services: "Serbisyo",
  bio: "Bio",
  yearsExperience: "Taon ng karanasan",
};

/** First validation problem as a readable line, or null if the body is valid. */
function firstProblem(body: unknown): string | null {
  const r = SignupRequest.safeParse(body);
  if (r.success) return null;
  const issue = r.error.issues[0]!;
  const field = FIELD_NAMES[String(issue.path[0])] ?? String(issue.path[0] ?? "");
  return field ? `${field}: ${issue.message}` : issue.message;
}

/** Sign-up: 1 role, 2 account details, 3 (workers) services, experience, bio. Needs internet. */
export default function Signup() {
  const { online } = useNetwork();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("Quezon City");
  const [services, setServices] = useState<ServiceCode[]>([]);
  const [years, setYears] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const body = {
    role: role ?? "CLIENT",
    name,
    email: email.trim(),
    password,
    phone,
    barangay,
    city,
    services: role === "WORKER" ? services : [],
    bio: role === "WORKER" ? bio : "",
    yearsExperience: years.trim() ? Number(years) : 0,
  };

  function back() {
    setError(null);
    if (step === 1) router.back();
    else setStep(step === 3 ? 2 : 1);
  }

  async function submit() {
    const problem = firstProblem(body);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      const user = await signup(body);
      router.replace("/"); // index decides: model setup (first run) or role home
    } catch (e) {
      setError(authErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setError(null);
    if (step === 1) return setStep(2);
    if (step === 2 && role === "WORKER") {
      // Check step 2 fields now; services are chosen on step 3.
      const problem = firstProblem({ ...body, services: ["PLUMBING"], yearsExperience: 0, bio: "" });
      if (problem) return setError(problem);
      return setStep(3);
    }
    void submit();
  }

  const last = step === 3 || (step === 2 && role === "CLIENT");
  const total = role === "CLIENT" ? 2 : 3;
  const footer = (
    <>
      <Button
        label={last ? "Create account" : "Next"}
        icon={last ? UserPlus : undefined}
        loading={busy}
        disabled={(step === 1 && !role) || (last && !online)}
        disabledReason={last && !online ? "Needs internet to create an account." : undefined}
        onPress={next}
      />
      <Button label={step === 1 ? "I have an account · Log in" : "Back"} variant="ghost" onPress={step === 1 ? () => router.replace("/login") : back} />
    </>
  );

  return (
    <Screen title="Create account" subtitle={`Step ${step} of ${total} · Gumawa ng account`} back footer={footer}>
      <View className="flex-row gap-2">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} className={`h-[6px] flex-1 rounded-full ${i < step ? "bg-lime" : "bg-border"}`} />
        ))}
      </View>
      {!online ? <Note>You're offline. Creating an account needs internet.</Note> : null}

      {step === 1 ? (
        <>
          <Text className="font-body-bold text-[20px] text-ink">How will you use TrabaWHO?</Text>
          <Choice selected={role === "CLIENT"} onPress={() => setRole("CLIENT")} icon={<House size={26} color={C.navy} weight="fill" />} title="Client" hint="I need something fixed at home · Magpapagawa ako" />
          <Choice selected={role === "WORKER"} onPress={() => setRole("WORKER")} icon={<Briefcase size={26} color={C.navy} weight="fill" />} title="Worker" hint="I take repair jobs · Tumatanggap ako ng trabaho" />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <Field label="Password (8+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="09171234567" />
          <Field label="Barangay" value={barangay} onChangeText={setBarangay} />
          <Field label="City" value={city} onChangeText={setCity} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Label>Your services (pick at least one)</Label>
          {catalog.services.map((s) => {
            const code = s.code as ServiceCode;
            const on = services.includes(code);
            return (
              <Choice
                key={code}
                selected={on}
                onPress={() => setServices(on ? services.filter((x) => x !== code) : [...services, code])}
                icon={<ServiceTile service={code} size={40} />}
                title={s.nameEn}
              />
            );
          })}
          <Field label="Years of experience" value={years} onChangeText={(t) => setYears(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="0" />
          <Field label="Short bio (optional)" value={bio} onChangeText={setBio} multiline maxLength={300} placeholder="e.g. Plumber, 10 years in Quezon City." />
        </>
      ) : null}

      {error ? <Note>{error}</Note> : null}
    </Screen>
  );
}

function Choice({ selected, onPress, icon, title, hint }: { selected: boolean; onPress: () => void; icon: ReactNode; title: string; hint?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} className="active:opacity-80">
      <View className={`rounded-3xl bg-surface p-4 ${selected ? "border-2 border-navy" : "border border-border"}`}>
        <View className="flex-row items-center gap-3">
          {icon}
          <View className="flex-1 gap-1">
            <Text className="font-body-bold text-[17px] text-ink">{title}</Text>
            {hint ? <Text className="font-body text-[13px] text-muted">{hint}</Text> : null}
          </View>
          {selected ? <CheckCircle size={26} color={C.navy} weight="fill" /> : <View className="h-6 w-6 rounded-full border-2 border-border-strong" />}
        </View>
      </View>
    </Pressable>
  );
}
