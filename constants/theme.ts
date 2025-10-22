/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#ff6600';
const tintColorDark = '#ff6600';

export const Colors = {
  light: {
    text: '#1a1410',
    background: '#f5f0e8',
    previewBackground: '#f5f0e8',
    tint: tintColorLight,
    icon: '#665c4f',
    tabIconDefault: '#8a7f6d',
    tabIconSelected: tintColorLight,
    border: '#e5ddd0',
    codeBackground: '#ebe4d8',
  },
  dark: {
    text: '#f0f0f0',
    background: '#0f0f0f',
    previewBackground: '#1a1a1a',
    tint: tintColorDark,
    icon: '#a8a8a8',
    tabIconDefault: '#a8a8a8',
    tabIconSelected: tintColorDark,
    border: '#333333',
    codeBackground: '#2a2a2a',
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
