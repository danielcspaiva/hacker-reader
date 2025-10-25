import { useThemeColor } from "@/hooks/use-theme-color";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={useThemeColor({}, "tint")}
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
