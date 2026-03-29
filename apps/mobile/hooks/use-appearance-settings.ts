import { useColorSchemeContext } from "@/contexts/color-scheme-context";

export const APPEARANCE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function useAppearanceSettings() {
  const { preference, setPreference } = useColorSchemeContext();

  const handleSelectionChange = (selection: string) => {
    const selected = APPEARANCE_OPTIONS.find((opt) => opt.value === selection);
    if (selected) {
      setPreference(selected.value);
    }
  };

  return {
    options: APPEARANCE_OPTIONS,
    selection: preference,
    handleSelectionChange,
  };
}
