import { useColorSchemeContext } from "@/contexts/color-scheme-context";

export const APPEARANCE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

/**
 * Hook for managing appearance settings.
 * Provides appearance options, current selection, and handler for option changes.
 *
 * @returns Object with appearance settings state and handlers
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const { options, selectedIndex, handleOptionSelected } = useAppearanceSettings();
 *
 *   return (
 *     <Picker
 *       options={options}
 *       selectedIndex={selectedIndex}
 *       onOptionSelected={handleOptionSelected}
 *     />
 *   );
 * }
 * ```
 */
export function useAppearanceSettings() {
  const { preference, setPreference } = useColorSchemeContext();

  const selectedIndex = APPEARANCE_OPTIONS.findIndex(
    (opt) => opt.value === preference
  );

  const handleOptionSelected = (event: { nativeEvent: { index: number } }) => {
    const selected = APPEARANCE_OPTIONS[event.nativeEvent.index];
    if (selected) {
      setPreference(selected.value);
    }
  };

  return {
    options: APPEARANCE_OPTIONS.map((opt) => opt.label),
    selectedIndex,
    handleOptionSelected,
  };
}
