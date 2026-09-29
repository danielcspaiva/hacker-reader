import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Cookies } from "@react-native-cookies/cookies";
import CookieManager from "@react-native-cookies/cookies";
import { router, Stack, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GuidelinesContent } from "@/components/guidelines-content";
import { ThemedText } from "@/components/themed-text";
import { GUIDELINES_ACCEPTED_KEY } from "@/constants/app-config";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useExternalLink } from "@/hooks/use-external-link";
import { useThemeColor } from "@/hooks/use-theme-color";
import { reportError } from "@/lib/observability";
import * as HNWriteAPI from "@/lib/shared/api/hn-write-api";
import { isAuthError } from "@/lib/shared/auth/errors";

function isCookieWithValue(cookie: unknown): cookie is { value: string } {
  return (
    typeof cookie === "object" &&
    cookie !== null &&
    "value" in cookie &&
    typeof cookie.value === "string"
  );
}

export default function LoginModal() {
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({ light: "#ccc", dark: "#444" }, "border");
  const placeholderColor = useThemeColor(
    { light: "#999", dark: "#666" },
    "text"
  );
  const secondaryTextColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "text"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState<boolean | null>(
    null
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login: contextLogin } = useHNAuth();
  const openLink = useExternalLink();

  const checkGuidelinesAcceptance = useCallback(async () => {
    try {
      const accepted = await AsyncStorage.getItem(GUIDELINES_ACCEPTED_KEY);
      setGuidelinesAccepted(accepted === "true");
    } catch (error) {
      reportError(error, { operation: "checkGuidelinesAcceptance" });
      setGuidelinesAccepted(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkGuidelinesAcceptance();
    }, [checkGuidelinesAcceptance])
  );

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

      const cookies: Cookies = await CookieManager.get(
        "https://news.ycombinator.com"
      );

      const cookieRecord: Record<string, string> = {};
      for (const [key, cookie] of Object.entries(cookies)) {
        if (isCookieWithValue(cookie)) {
          cookieRecord[key] = cookie.value;
        }
      }

      if (!cookieRecord["user"]) {
        throw new Error("Login succeeded but no session cookie found");
      }

      await SecureStore.setItemAsync(
        "hn_cookies",
        JSON.stringify(cookieRecord)
      );

      await contextLogin(cookieRecord, username.trim());

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/profile");
      }
    } catch (err) {
      if (isAuthError(err)) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
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

  return (
    <SafeAreaView style={styles.container}>
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

      {error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      {guidelinesAccepted === true && !loading ? (
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor, backgroundColor },
              ]}
              placeholder="Enter your HN username"
              placeholderTextColor={placeholderColor}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor, backgroundColor },
              ]}
              placeholder="Enter your password"
              placeholderTextColor={placeholderColor}
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

          <TouchableOpacity
            style={[
              styles.loginButton,
              (!username || !password) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!username || !password || loading}
          >
            <ThemedText style={styles.loginButtonText}>Sign in</ThemedText>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <ThemedText
              style={[styles.infoText, { color: secondaryTextColor }]}
            >
              Don&apos;t have an account?{" "}
              <ThemedText
                style={[styles.infoText, styles.link]}
                onPress={() => openLink("https://news.ycombinator.com/login")}
              >
                Create one on Hacker News (free)
              </ThemedText>
            </ThemedText>
            <ThemedText
              style={[
                styles.infoText,
                { color: secondaryTextColor, marginTop: 16 },
              ]}
            >
              Your password is sent directly to Hacker News and never stored in
              this app.
            </ThemedText>
          </View>
        </View>
      ) : null}

      {loading || guidelinesAccepted === null ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6600" />
          {loading ? (
            <ThemedText style={styles.loadingText}>
              Signing you in...
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: "#ff6600",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: "#ff6600",
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  link: {
    color: "#ff6600",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fee",
    borderRadius: 8,
  },
  errorText: {
    color: "#c00",
    fontSize: 14,
  },
});
