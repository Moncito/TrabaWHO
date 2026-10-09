import { router } from "expo-router";
import { AirplaneTilt, Cpu, SignIn, UserPlus } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { HeaderLink, Note, Screen } from "@/components/Screen";
import { Button, C, Field } from "@/components/ui";
import { authErrorText, login } from "@/data/auth";
import { startGuest } from "@/data/session";
import { useNetwork } from "@/data/sync";

/** C01: email + password login. Needs internet; after that the app works offline. */
export default function Login() {
  const { online } = useNetwork();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      router.replace("/"); // index decides: model setup (first run) or role home
    } catch (e) {
      setError(authErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  const ready = email.trim().length > 3 && password.length > 0;

  return (
    <Screen
      title="Welcome back"
      subtitle="Log in to TrabaWHO · Mag-log in"
      back={router.canGoBack()}
      right={
        <HeaderLink href="/ai-stats" label="AI stats">
          <Cpu size={24} color={C.lime} weight="bold" />
        </HeaderLink>
      }
      footer={
        <>
          <Button
            label="Log in"
            icon={SignIn}
            loading={busy}
            disabled={!ready || !online}
            disabledReason={!online ? "Needs internet to log in." : undefined}
            onPress={submit}
          />
          <Button label="Create an account" icon={UserPlus} variant="ghost" onPress={() => router.push("/signup")} />
        </>
      }
    >
      {!online ? <Note>You're offline. Logging in needs internet once; after that the app works offline.</Note> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="you@email.com" />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => ready && online && void submit()}
      />
      {error ? <Note>{error}</Note> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          startGuest();
          router.replace("/");
        }}
        className="mt-2 flex-row items-center gap-3 rounded-3xl border border-border bg-surface p-4 active:opacity-80"
      >
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-navy">
          <AirplaneTilt size={20} color={C.lime} weight="fill" />
        </View>
        <View className="flex-1">
          <Text className="font-body-bold text-[15px] text-ink">Try the AI without an account</Text>
          <Text className="font-body text-xs text-muted">No internet needed · Subukan nang walang account</Text>
        </View>
      </Pressable>
    </Screen>
  );
}
