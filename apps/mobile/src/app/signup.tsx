import { catalog, SignupRequest, type Role, type ServiceCode } from "@trabawho/shared";
import { router } from "expo-router";
import { Check, CheckCircle, UserPlus } from "phosphor-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { AuthLayout, TextLink } from "@/components/AuthLayout";
import { Note } from "@/components/Screen";
import { Button, C, Field, Label, ServiceTile } from "@/components/ui";
import { authErrorText, signup } from "@/data/auth";
import { useNetwork } from "@/data/sync";

const FIELD_NAMES: Record<string, string> = {
  email: "Email",
  password: "Password",
  name: "Full name",
  phone: "Phone",
  city: "City",
  barangay: "Barangay",
  services: "Services",
  bio: "Bio",
  yearsExperience: "Years of experience",
};

/** First validation problem as a readable line, or null if the body is valid. */
function firstProblem(body: unknown): string | null {
  const r = SignupRequest.safeParse(body);
  if (r.success) return null;
  const issue = r.error.issues[0]!;
  const field = FIELD_NAMES[String(issue.path[0])] ?? String(issue.path[0] ?? "");
  return field ? `${field}: ${issue.message}` : issue.message;
}

/** Sign-up (artboard A2): role switch + account details; workers add services on step 2. Needs internet. */
export default function Signup() {
  const { online } = useNetwork();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("CLIENT");
  const [agreed, setAgreed] = useState(false);
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
    role,
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

  const total = role === "WORKER" ? 2 : 1;
  const last = step === total;

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
    if (!agreed) return setError("Please agree to the Terms and Privacy Policy.");
    if (step === 1 && role === "WORKER") {
      // Check the account fields now; services are chosen on step 2.
      const problem = firstProblem({ ...body, services: ["PLUMBING"], yearsExperience: 0, bio: "" });
      if (problem) return setError(problem);
      return setStep(2);
    }
    void submit();
  }

  return (
    <AuthLayout
      title="Create your"
      mark={step === 2 ? "worker profile" : "account"}
      subtitle={step === 2 ? "Step 2 of 2 · What jobs do you take?" : "Gumawa ng account. It takes a minute."}
      back
      footer={
        step === 1 ? (
          <Text className="font-body text-[14px] text-muted">
            Already have an account? <TextLink label="Log in" onPress={() => router.replace("/login")} />
          </Text>
        ) : undefined
      }
    >
      {!online ? <Note>You're offline. Creating an account needs internet.</Note> : null}

      {step === 1 ? (
        <>
          <View className="gap-[6px]">
            <Label>I am signing up as</Label>
            <View accessibilityRole="radiogroup" className="flex-row rounded-full border border-border bg-soft p-1">
              {(["CLIENT", "WORKER"] as const).map((r) => (
                <Pressable
                  key={r}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: role === r }}
                  onPress={() => setRole(r)}
                  className={`h-11 flex-1 items-center justify-center rounded-full ${role === r ? "bg-navy" : ""}`}
                >
                  <Text className={`font-body-bold text-sm ${role === r ? "text-white" : "text-muted"}`}>{r === "CLIENT" ? "I need help" : "I'm a worker"}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Ana Reyes" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="you@email.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" placeholder="At least 8 characters" />
          <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="09171234567" />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Barangay" value={barangay} onChangeText={setBarangay} placeholder="Batasan Hills" />
            </View>
            <View className="flex-1">
              <Field label="City" value={city} onChangeText={setCity} />
            </View>
          </View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed((v) => !v)} className="min-h-11 flex-row items-center justify-center gap-[10px]">
            <View className={`h-[22px] w-[22px] items-center justify-center rounded-md border-2 ${agreed ? "border-navy bg-navy" : "border-border-strong bg-surface"}`}>
              {agreed ? <Check size={14} color={C.white} weight="bold" /> : null}
            </View>
            <Text className="font-body text-[14px] text-muted">
              I agree to the <Text className="font-body-bold text-navy">Terms</Text> and <Text className="font-body-bold text-navy">Privacy Policy</Text>.
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Label>Your services (pick at least one)</Label>
          {catalog.services.map((sv) => {
            const code = sv.code as ServiceCode;
            const on = services.includes(code);
            return <Choice key={code} selected={on} onPress={() => setServices(on ? services.filter((x) => x !== code) : [...services, code])} icon={<ServiceTile service={code} size={40} />} title={sv.nameEn} />;
          })}
          <Field label="Years of experience" value={years} onChangeText={(t) => setYears(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="0" />
          <Field label="Short bio (optional)" value={bio} onChangeText={setBio} multiline maxLength={300} placeholder="e.g. Plumber, 10 years in Quezon City." />
        </>
      )}

      {error ? <Note>{error}</Note> : null}
      <Button label={last ? "Create account" : "Next"} icon={last ? UserPlus : undefined} loading={busy} disabled={last && !online} disabledReason={last && !online ? "Needs internet to create an account." : undefined} onPress={next} />
      {step === 2 ? <Button label="Back" variant="ghost" size="sm" onPress={() => setStep(1)} /> : null}
    </AuthLayout>
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
