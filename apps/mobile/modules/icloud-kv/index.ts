import { requireOptionalNativeModule } from "expo";

import type {
  ICloudChangeReason,
  ICloudExternalChange,
  ICloudKV,
} from "./types";
import { unavailableICloudKV } from "./unavailable";

export type {
  ICloudChangeReason,
  ICloudExternalChange,
  ICloudKV,
  ICloudKVSubscription,
} from "./types";

interface NativeICloudKV {
  isAvailable(): boolean;
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  remove(key: string): void;
  synchronize(): boolean;
  addListener(
    eventName: "onExternalChange",
    listener: (event: { reason?: string; keys?: string[] }) => void
  ): { remove(): void };
}

const REASONS: readonly ICloudChangeReason[] = [
  "server",
  "initialSync",
  "quotaViolation",
  "accountChange",
];

function toReason(value: string | undefined): ICloudChangeReason {
  return REASONS.find((reason) => reason === value) ?? "unknown";
}

// Null in Expo Go and on platforms without the module (see `unavailable.ts`).
const native = requireOptionalNativeModule<NativeICloudKV>("ICloudKV");

export const ICloudKVModule: ICloudKV = native
  ? {
      isAvailable: () => native.isAvailable(),
      getString: (key) => native.getString(key),
      setString: (key, value) => native.setString(key, value),
      remove: (key) => native.remove(key),
      synchronize: () => native.synchronize(),
      addExternalChangeListener: (listener) =>
        native.addListener("onExternalChange", (event): void =>
          listener({
            reason: toReason(event.reason),
            keys: event.keys ?? [],
          } satisfies ICloudExternalChange)
        ),
    }
  : unavailableICloudKV;
