import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import type { WidgetSize } from "@/lib/analytics/tracking";
import { useAnalytics } from "./use-analytics";

type StoredWidgetKey = string;

type NativeWidgetConfiguration = {
  kind?: string;
  family?: string;
};

type NormalizedWidgetConfiguration = {
  key: StoredWidgetKey;
  kind: string;
  size: WidgetSize;
};

type ParsedWidgetTap = {
  size: WidgetSize;
  storyId?: number;
  kind?: string;
};

const WIDGET_CONFIG_STORAGE_KEY = "@hn/widgets/configurations";

const FAMILY_TO_SIZE: Record<string, WidgetSize> = {
  systemSmall: "small",
  systemMedium: "medium",
  systemLarge: "large",
  small: "small",
  medium: "medium",
  large: "large",
};

function logWidgetAnalytics(...args: unknown[]) {
  if (__DEV__) {
    // console.log("[WidgetAnalytics]", ...args);
  }
}

const ReactNativeWidgetExtension: {
  getCurrentConfigurations?: () => Promise<NativeWidgetConfiguration[]>;
} | null =
  Platform.OS === "ios"
    ? (() => {
        try {
          const module =
            require("react-native-widget-extension/build/ReactNativeWidgetExtensionModule").default;
          logWidgetAnalytics("Loaded native widget module.");
          return module;
        } catch (error) {
          logWidgetAnalytics("Native widget module unavailable:", error);
          return null;
        }
      })()
    : null;

function mapFamilyToSize(family?: string): WidgetSize | undefined {
  if (!family) return undefined;
  return FAMILY_TO_SIZE[family];
}

function normalizeConfiguration(
  config: NativeWidgetConfiguration
): NormalizedWidgetConfiguration | null {
  if (!config.kind) return null;

  const size = mapFamilyToSize(config.family);
  if (!size) return null;

  return {
    key: `${config.kind}:${size}`,
    kind: config.kind,
    size,
  };
}

function parseWidgetTap(url: string): ParsedWidgetTap | null {
  try {
    const parsed = Linking.parse(url);
    if (!parsed?.path && !parsed?.hostname) {
      return null;
    }

    const queryParams = parsed.queryParams ?? {};
    if (queryParams.source !== "widget") return null;

    const sizeParam = queryParams.widgetSize;
    const size =
      typeof sizeParam === "string" ? mapFamilyToSize(sizeParam) : undefined;
    if (!size) return null;

    const { widgetKind } = queryParams;

    let storyId: number | undefined;

    const regexMatch = url.match(/:\/\/story\/(\d+)/);
    if (regexMatch?.[1]) {
      const numericStoryId = Number(regexMatch[1]);
      if (Number.isFinite(numericStoryId)) {
        storyId = numericStoryId;
      }
    }

    if (!storyId) {
      const segments = (parsed.path ?? "")
        .split("/")
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

      if (segments.length >= 2 && segments[0] === "story") {
        const numericStoryId = Number(segments[1]);
        if (Number.isFinite(numericStoryId)) {
          storyId = numericStoryId;
        }
      } else if (segments.length === 1) {
        const host =
          typeof parsed.hostname === "string" ? parsed.hostname : undefined;
        if (host === "story") {
          const numericStoryId = Number(segments[0]);
          if (Number.isFinite(numericStoryId)) {
            storyId = numericStoryId;
          }
        }
      }
    }

    return {
      size,
      storyId,
      kind: typeof widgetKind === "string" ? widgetKind : undefined,
    };
  } catch (error) {
    console.warn("[Analytics] Failed to parse widget tap URL:", error);
    return null;
  }
}

export function useWidgetAnalytics() {
  const { track, registerSuper, isReady } = useAnalytics();
  const hasProcessedInitialUrl = useRef(false);

  useEffect(() => {
    if (!isReady || Platform.OS !== "ios") return;
    if (
      !ReactNativeWidgetExtension ||
      typeof ReactNativeWidgetExtension.getCurrentConfigurations !== "function"
    ) {
      logWidgetAnalytics(
        "Widget analytics disabled; native module unavailable or missing getCurrentConfigurations"
      );
      return;
    }

    let isCancelled = false;
    let syncInFlight = false;

    const syncWidgetConfigurations = async () => {
      if (syncInFlight || isCancelled) {
        return;
      }

      syncInFlight = true;

      try {
        const configurationsRaw =
          await ReactNativeWidgetExtension?.getCurrentConfigurations?.();
        const configurations = Array.isArray(configurationsRaw)
          ? (configurationsRaw as NativeWidgetConfiguration[])
          : [];

        logWidgetAnalytics(
          "Fetched native widget configurations:",
          configurations
        );

        const normalized = configurations
          .map(normalizeConfiguration)
          .filter(
            (config): config is NormalizedWidgetConfiguration => config !== null
          );

        const uniqueConfigMap = new Map<
          string,
          NormalizedWidgetConfiguration
        >();
        normalized.forEach((config) => {
          if (!uniqueConfigMap.has(config.key)) {
            uniqueConfigMap.set(config.key, config);
          }
        });
        const uniqueConfigurations = Array.from(uniqueConfigMap.values());

        logWidgetAnalytics(
          "Normalized widget configurations:",
          uniqueConfigurations
        );

        const currentKeys = uniqueConfigurations.map((config) => config.key);
        const storedRaw = await AsyncStorage.getItem(WIDGET_CONFIG_STORAGE_KEY);
        let storedKeys: StoredWidgetKey[] = [];
        if (storedRaw) {
          try {
            const parsed = JSON.parse(storedRaw);
            if (Array.isArray(parsed)) {
              storedKeys = parsed as StoredWidgetKey[];
            }
          } catch (error) {
            console.warn(
              "[Analytics] Failed to parse stored widget configurations:",
              error
            );
          }
        }

        logWidgetAnalytics("Stored widget keys:", storedKeys);
        logWidgetAnalytics("Current widget keys:", currentKeys);

        const currentSet = new Set(currentKeys);
        const storedSet = new Set(storedKeys);

        const newConfigurations = uniqueConfigurations.filter(
          (config) => !storedSet.has(config.key)
        );

        if (newConfigurations.length > 0) {
          logWidgetAnalytics(
            "Detected new widget configurations:",
            newConfigurations
          );
        } else {
          logWidgetAnalytics("No new widget configurations detected.");
        }

        newConfigurations.forEach((config) => {
          track(AnalyticsEvent.WIDGET_ADDED, {
            [AnalyticsProperty.WIDGET_KIND]: config.kind,
            [AnalyticsProperty.WIDGET_SIZE]: config.size,
          });
        });

        await AsyncStorage.setItem(
          WIDGET_CONFIG_STORAGE_KEY,
          JSON.stringify(Array.from(currentSet))
        );

        logWidgetAnalytics(
          "Updated stored widget keys:",
          Array.from(currentSet)
        );

        registerSuper({
          [AnalyticsProperty.HAS_WIDGET_INSTALLED]: currentSet.size > 0,
        });
        logWidgetAnalytics(
          "Registered super property has_widget_installed:",
          currentSet.size > 0
        );
      } catch (error) {
        console.warn(
          "[Analytics] Failed to sync widget configurations:",
          error
        );
      } finally {
        syncInFlight = false;
      }
    };

    syncWidgetConfigurations();
    logWidgetAnalytics("Initialized widget analytics sync");

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncWidgetConfigurations();
        logWidgetAnalytics("App became active; syncing widget configurations");
      }
    });

    return () => {
      isCancelled = true;
      subscription.remove();
    };
  }, [isReady, track, registerSuper]);

  useEffect(() => {
    if (!isReady || Platform.OS !== "ios") {
      return;
    }

    const handleUrl = (url: string) => {
      const payload = parseWidgetTap(url);
      if (!payload) return;

      logWidgetAnalytics("Tracking widget tap payload:", payload);

      track(AnalyticsEvent.WIDGET_TAPPED, {
        [AnalyticsProperty.WIDGET_SIZE]: payload.size,
        [AnalyticsProperty.STORY_ID]: payload.storyId,
        [AnalyticsProperty.WIDGET_KIND]: payload.kind,
      });
    };

    const processInitialUrl = async () => {
      if (hasProcessedInitialUrl.current) {
        return;
      }
      hasProcessedInitialUrl.current = true;

      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleUrl(initialUrl);
          logWidgetAnalytics("Processed initial URL:", initialUrl);
        }
      } catch (error) {
        console.warn("[Analytics] Failed to read initial URL:", error);
      }
    };

    processInitialUrl();

    const subscription = Linking.addEventListener("url", (event) => {
      if (event?.url) {
        handleUrl(event.url);
        logWidgetAnalytics("Received deep link URL:", event.url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isReady, track]);
}
