import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Typography } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'headline' | 'bodyLarge' | 'body' | 'bodySmall' | 'label' | 'caption';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, type === 'link' ? 'tint' : 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'headline' ? styles.headline : undefined,
        type === 'bodyLarge' ? styles.bodyLarge : undefined,
        type === 'body' ? styles.body : undefined,
        type === 'bodySmall' ? styles.bodySmall : undefined,
        type === 'label' ? styles.label : undefined,
        type === 'caption' ? styles.caption : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
  headline: Typography.headline,
  bodyLarge: Typography.bodyLarge,
  body: Typography.body,
  bodySmall: Typography.bodySmall,
  label: Typography.label,
  caption: Typography.caption,
});
