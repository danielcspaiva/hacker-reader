/** Why iCloud told us the store changed. */
export type ICloudChangeReason =
  | "server"
  | "initialSync"
  | "quotaViolation"
  | "accountChange"
  | "unknown";

export interface ICloudExternalChange {
  reason: ICloudChangeReason;
  keys: string[];
}

export interface ICloudKVSubscription {
  remove(): void;
}

/** The JS surface of the `ICloudKV` module (native on iOS, a no-op elsewhere). */
export interface ICloudKV {
  /** False off iOS, in Expo Go, or when signed out of iCloud. */
  isAvailable(): boolean;
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  remove(key: string): void;
  /** Asks iCloud to sync now; false when it could not. */
  synchronize(): boolean;
  addExternalChangeListener(
    listener: (change: ICloudExternalChange) => void
  ): ICloudKVSubscription;
}
