import { Colors } from "@/constants/theme";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";

export default function TabLayout() {
  const { colorScheme, colorPalette } = useColorSchemeContext();
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor =
    colorScheme === "dark"
      ? Colors.dark[colorPalette].background
      : Colors.light[colorPalette].background;

  return (
    <NativeTabs
      tintColor={tintColor}
      backgroundColor={backgroundColor}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="feed">
        <Icon sf="newspaper" />
        <Label>Stories</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookmarks">
        <Icon sf="bookmark" />
        <Label>Bookmarks</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf="gear" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <Icon sf="magnifyingglass" />
        <Label>Search</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
