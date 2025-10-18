/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#ff6600';
const tintColorDark = '#ff6600';

export const Colors = {
  light: {
    text: '#1a1a1a',
    background: '#f6f6f6',
    previewBackground: '#fafafa',
    tint: tintColorLight,
    icon: '#666666',
    tabIconDefault: '#666666',
    tabIconSelected: tintColorLight,
    border: '#e5e5e5',
  },
  dark: {
    text: '#e8e8e8',
    background: '#0f0f0f',
    previewBackground: '#1a1a1a',
    tint: tintColorDark,
    icon: '#999999',
    tabIconDefault: '#999999',
    tabIconSelected: tintColorDark,
    border: '#333333',
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
