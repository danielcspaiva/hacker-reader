import { Colors } from "@/constants/theme";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { NativeTabs } from "expo-router/native-tabs";
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
      tabBarRespectsIMEInsets
    >
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Icon
          sf={{ default: "newspaper", selected: "newspaper.fill" }}
          md={{ default: "article", selected: "article" }}
        />
        <NativeTabs.Trigger.Label>Stories</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookmarks">
        <NativeTabs.Trigger.Icon
          sf={{ default: "bookmark", selected: "bookmark.fill" }}
          md={{ default: "bookmark", selected: "bookmark" }}
        />
        <NativeTabs.Trigger.Label>Bookmarks</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md={{ default: "person", selected: "person" }}
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md={{ default: "settings", selected: "settings" }}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Icon
          sf={{ default: "magnifyingglass", selected: "magnifyingglass" }}
          md={{ default: "search", selected: "search" }}
        />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
