/**
 * HN Login Modal Route
 *
 * Displays a native login form for Hacker News authentication.
 * POSTs credentials directly to HN and extracts session cookies.
 * Redirects to HN Guidelines screen if not yet accepted.
 */

import { ThemedText } from "@/components/themed-text";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useExternalLink } from "@/hooks/use-external-link";
import { useThemeColor } from "@/hooks/use-theme-color";
import { reportError } from "@/lib/observability";
import * as HNWriteAPI from "@/lib/shared/api/hn-write-api";
import { isAuthError } from "@/lib/shared/auth/errors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Cookies } from "@react-native-cookies/cookies";
import CookieManager from "@react-native-cookies/cookies";
import { useFocusEffect } from "expo-router/react-navigation";
import { router } from "expo-router";
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

const GUIDELINES_ACCEPTED_KEY = "@guidelines_accepted";

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
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login: contextLogin } = useHNAuth();
  const openLink = useExternalLink();

  const checkGuidelinesAcceptance = useCallback(async () => {
    try {
      const accepted = await AsyncStorage.getItem(GUIDELINES_ACCEPTED_KEY);
      if (accepted === "true") {
        setGuidelinesAccepted(true);
      } else {
        // Redirect to guidelines screen if not accepted
        router.push("/auth/guidelines");
      }
    } catch (error) {
      reportError(error, { operation: "checkGuidelinesAcceptance" });
      // On error, redirect to guidelines to be safe
      router.push("/auth/guidelines");
    }
  }, []);

  // Check if guidelines were previously accepted
  // Use useFocusEffect to re-check when screen comes into focus (e.g., after accepting guidelines)
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
      // Call native login API (this performs the login and follows redirects)
      await HNWriteAPI.login(username.trim(), password);

      // Wait a bit for cookies to settle
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      // Extract cookies using native cookie manager (more reliable than header parsing)
      const cookies: Cookies = await CookieManager.get(
        "https://news.ycombinator.com"
      );

      // Convert Cookies object to Record<string, string>
      const cookieRecord: Record<string, string> = {};
      for (const [key, cookie] of Object.entries(cookies)) {
        if (
          typeof cookie === "object" &&
          cookie !== null &&
          "value" in cookie
        ) {
          cookieRecord[key] = cookie.value;
        }
      }

      // Validate we got session cookie
      if (!cookieRecord["user"]) {
        throw new Error("Login succeeded but no session cookie found");
      }

      // Store cookies securely
      await SecureStore.setItemAsync(
        "hn_cookies",
        JSON.stringify(cookieRecord)
      );

      // Update auth context with username
      await contextLogin(cookieRecord, username.trim());

      // Dismiss the modal after successful login
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/settings");
      }
    } catch (err) {
      setLoading(false);

      if (isAuthError(err)) {
        // Use the error message from HNAuthError
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {guidelinesAccepted && !loading && (
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
            <ThemedText style={[styles.infoText, { color: secondaryTextColor }]}>
              Don&apos;t have an account?{" "}
              <ThemedText
                style={[styles.infoText, styles.link]}
                onPress={() => openLink("https://news.ycombinator.com/login")}
              >
                Create one on Hacker News (free)
              </ThemedText>
            </ThemedText>
            <ThemedText
              style={[styles.infoText, { color: secondaryTextColor, marginTop: 16 }]}
            >
              Your password is sent directly to Hacker News and never stored in
              this app.
            </ThemedText>
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6600" />
          <ThemedText style={styles.loadingText}>Signing you in...</ThemedText>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
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
