/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorSchemeContext } from '@/contexts/color-scheme-context';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light['lights-out'] & keyof typeof Colors.dark['lights-out']
) {
  const { colorScheme, colorPalette } = useColorSchemeContext();
  const theme = colorScheme ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorPalette][colorName];
  }
}
