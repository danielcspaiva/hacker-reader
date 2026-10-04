import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";
import { createContext, use, useEffect, useState } from "react";

import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { trackEvent } from "@/lib/analytics/tracking";
import {
  DEFAULT_TEXT_SIZE,
  isTextSize,
  TEXT_SIZE_SCALE,
  type TextSize,
} from "@/lib/text/text-size";

interface TextSizeContextType {
  textSize: TextSize;
  /** Multiplier for `scalable` text. */
  scale: number;
  setTextSize: (size: TextSize) => void;
}

const DEFAULT_CONTEXT: TextSizeContextType = {
  textSize: DEFAULT_TEXT_SIZE,
  scale: 1,
  setTextSize: () => undefined,
};

// A default value (not undefined) so `Text` also works outside the provider.
const TextSizeContext = createContext<TextSizeContextType>(DEFAULT_CONTEXT);

const STORAGE_KEY = "@hn_client_text_size";

/** The persisted reading text size. Unlike appearance it does not hold back rendering. */
export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>(DEFAULT_TEXT_SIZE);
  const posthog = usePostHog();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (isTextSize(value)) setTextSizeState(value);
      })
      .catch(() => undefined);
  }, []);

  const setTextSize = (size: TextSize) => {
    if (size === textSize) return;
    trackEvent(posthog, AnalyticsEvent.TEXT_SIZE_CHANGED, {
      from_size: textSize,
      to_size: size,
    });
    setTextSizeState(size);
    AsyncStorage.setItem(STORAGE_KEY, size).catch(() => undefined);
  };

  return (
    <TextSizeContext.Provider
      value={{ textSize, scale: TEXT_SIZE_SCALE[textSize], setTextSize }}
    >
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  return use(TextSizeContext);
}
