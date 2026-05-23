import { useColorSchemeContext } from "@/contexts/color-scheme-context";

export const APPEARANCE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

/**
 * Hook for managing appearance settings.
 * Provides appearance options, the current selection, and a setter for the
 * tag-based `@expo/ui` Picker API.
 *
 * @returns Object with appearance settings state and handlers
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const { options, preference, setPreference } = useAppearanceSettings();
 *
 *   return (
 *     <Picker selection={preference} onSelectionChange={setPreference}>
 *       {options.map((opt) => (
 *         <Text key={opt.value} modifiers={[tag(opt.value)]}>
 *           {opt.label}
 *         </Text>
 *       ))}
 *     </Picker>
 *   );
 * }
 * ```
 */
export function useAppearanceSettings() {
  const { preference, setPreference } = useColorSchemeContext();

  return {
    options: APPEARANCE_OPTIONS,
    preference,
    setPreference,
  };
}
