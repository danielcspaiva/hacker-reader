import type { ICloudKV } from "./types";

/** Android, web and builds without the native module: sync is unavailable. */
export const unavailableICloudKV: ICloudKV = {
  isAvailable: () => false,
  getString: () => null,
  setString: () => {},
  remove: () => {},
  synchronize: () => false,
  addExternalChangeListener: () => ({ remove: () => {} }),
};
