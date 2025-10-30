/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    'lights-out': {
      text: '#000000',
      background: '#ffffff',
      previewBackground: '#ffffff',
      tint: '#ff6600',
      icon: '#666666',
      tabIconDefault: '#999999',
      tabIconSelected: '#ff6600',
      border: '#e0e0e0',
      codeBackground: '#f5f5f5',
    },
  },
  dark: {
    'lights-out': {
      text: '#ffffff',
      background: '#000000',
      previewBackground: '#111111',
      tint: '#ff6600',
      icon: '#cccccc',
      tabIconDefault: '#cccccc',
      tabIconSelected: '#ff6600',
      border: '#1a1a1a',
      codeBackground: '#0a0a0a',
    },
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Typography scale - semantic font sizes for consistent hierarchy
 */
export const Typography = {
  /** 28px - Large headings */
  headline: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
  /** 20px - Section titles */
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  /** 17px - Primary content, story titles */
  bodyLarge: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  /** 15px - Standard body text */
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  /** 14px - Emphasized metadata */
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  /** 13px - Secondary body text */
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  /** 12px - Tertiary text, fine print */
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
} as const;

/**
 * Spacing scale - 8px grid system for consistent vertical rhythm
 */
export const Spacing = {
  /** 4px - Tight spacing within grouped elements */
  xs: 4,
  /** 8px - Related elements */
  sm: 8,
  /** 12px - Component internal spacing */
  md: 12,
  /** 16px - Standard padding and gaps */
  lg: 16,
  /** 20px - Generous spacing */
  xl: 20,
  /** 24px - Section separation */
  '2xl': 24,
  /** 32px - Major section breaks */
  '3xl': 32,
} as const;
