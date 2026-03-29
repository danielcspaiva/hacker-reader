import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Load and parse a JSON value from AsyncStorage
 * Returns the fallback value on error or missing key
 */
export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
    return fallback;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return fallback;
  }
}

/**
 * Serialize and save a value to AsyncStorage
 */
export async function saveJSON<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}
