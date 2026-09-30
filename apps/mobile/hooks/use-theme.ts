import { Colors, type Theme } from "@/constants/theme";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";

/** Resolved scheme plus the token set for it. The one way to read colours. */
export function useTheme(): Theme {
  const { colorScheme } = useColorSchemeContext();
  return { scheme: colorScheme, colors: Colors[colorScheme] };
}
