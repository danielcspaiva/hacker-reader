import AsyncStorage from "@react-native-async-storage/async-storage";
import CookieManager from "@react-native-cookies/cookies";
import { router, Stack, useFocusEffect } from "expo-router";
import { type ComponentRef, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";

import { GuidelinesContent } from "@/components/guidelines-content";
import { Button, Field, Icon, Text } from "@/components/ui";
import { GUIDELINES_ACCEPTED_KEY } from "@/constants/app-config";
import { GUTTER, Radius, withAlpha } from "@/constants/theme";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useExternalLink } from "@/hooks/use-external-link";
import { useTheme } from "@/hooks/use-theme";
import { isCookieMap } from "@/lib/hn";
import * as HNWriteAPI from "@/lib/hn/web/write-api";
import { reportError } from "@/lib/observability/report-error";

export default function LoginModal() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState<boolean | null>(
    null
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login: contextLogin } = useHNAuth();
  const openLink = useExternalLink();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const checkGuidelinesAcceptance = async () => {
    try {
      const accepted = await AsyncStorage.getItem(GUIDELINES_ACCEPTED_KEY);
      setGuidelinesAccepted(accepted === "true");
    } catch (error) {
      reportError(error, { operation: "checkGuidelinesAcceptance" });
      setGuidelinesAccepted(false);
    }
  };

  useFocusEffect(() => {
    void checkGuidelinesAcceptance();
  });

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await HNWriteAPI.login(username.trim(), password);
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      const cookies = await CookieManager.get("https://news.ycombinator.com");
      const cookieRecord: unknown = Object.fromEntries(
        Object.entries(cookies).map(([name, cookie]) => [name, cookie.value])
      );

      if (!isCookieMap(cookieRecord) || !cookieRecord["user"]) {
        throw new Error("Login succeeded but no session cookie found");
      }

      await contextLogin(cookieRecord, username.trim());

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/profile");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const acceptGuidelines = async () => {
    try {
      await AsyncStorage.setItem(GUIDELINES_ACCEPTED_KEY, "true");
    } catch (error) {
      reportError(error, { operation: "saveGuidelinesAcceptance" });
    }
    setGuidelinesAccepted(true);
  };

  const canSubmit = username.length > 0 && password.length > 0 && !loading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle:
            guidelinesAccepted === true
              ? "Sign in to Hacker News"
              : "Hacker News Guidelines",
        }}
      />
      {guidelinesAccepted === false ? (
        <GuidelinesContent
          onAccept={() => {
            void acceptGuidelines();
          }}
          onCancel={() => router.back()}
        />
      ) : null}

      {guidelinesAccepted === true ? (
        <View style={styles.form}>
          {error ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.error,
                { backgroundColor: withAlpha(colors.danger, 0.14) },
              ]}
            >
              <Icon name="error" size={18} color={colors.danger} />
              <Text variant="callout" tone="destructive" style={styles.flex}>
                {error}
              </Text>
            </View>
          ) : null}

          <View style={styles.group}>
            <Text variant="label" tone="muted">
              Username
            </Text>
            <Field
              style={error ? { borderColor: colors.danger } : undefined}
              placeholder="Your HN username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
            />
          </View>

          <View style={styles.group}>
            <Text variant="label" tone="muted">
              Password
            </Text>
            <Field
              ref={passwordRef}
              style={error ? { borderColor: colors.danger } : undefined}
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              editable={!loading}
            />
          </View>

          <Button
            label="Sign in"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!canSubmit && !loading}
            onPress={handleLogin}
          />

          <View style={styles.info}>
            <Text variant="caption" tone="muted" style={styles.center}>
              Don&apos;t have an account?{" "}
              <Text
                variant="caption"
                tone="primary"
                weight="medium"
                accessibilityRole="link"
                onPress={() => openLink("https://news.ycombinator.com/login")}
              >
                Create one on Hacker News (free)
              </Text>
            </Text>
            <Text variant="caption" tone="muted" style={styles.center}>
              Your password is sent directly to Hacker News and never stored in
              this app.
            </Text>
          </View>
        </View>
      ) : null}

      {guidelinesAccepted === null ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  form: { padding: GUTTER, gap: 20 },
  group: { gap: 8 },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: Radius.control,
    borderCurve: "continuous",
  },
  info: { gap: 12, marginTop: 4 },
  center: { textAlign: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
