import { router } from "expo-router";
import { Cpu, SignIn, UserPlus } from "phosphor-react-native";
import { useState } from "react";

import { HeaderLink, Note, Screen } from "@/components/Screen";
import { Button, C, Field } from "@/components/ui";
import { authErrorText, login } from "@/data/auth";
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
    </Screen>
  );
}
