import { NativeTabs } from "expo-router/native-tabs";
import { Platform } from "react-native";

import { tabIcon } from "@/components/ui";
import { FeedCategoryProvider } from "@/contexts/feed-category-context";
import { useTheme } from "@/hooks/use-theme";

// Triggers stay literal JSX: NativeTabs has crashed on mapped/non-literal
// children, so only the icon props come from the shared helper.
export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <FeedCategoryProvider>
      <NativeTabs
        tintColor={colors.primary}
        backgroundColor={
          Platform.OS === "android" ? colors.background : undefined
        }
        minimizeBehavior="never"
        tabBarRespectsIMEInsets
      >
        <NativeTabs.Trigger name="feed">
          <NativeTabs.Trigger.Icon {...tabIcon("stories", "storiesFilled")} />
          <NativeTabs.Trigger.Label>Stories</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="bookmarks">
          <NativeTabs.Trigger.Icon {...tabIcon("bookmark", "bookmarkFilled")} />
          <NativeTabs.Trigger.Label>Bookmarks</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon {...tabIcon("user", "userFilled")} />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon {...tabIcon("settings", "settingsFilled")} />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search" role="search">
          <NativeTabs.Trigger.Icon {...tabIcon("search")} />
          <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </FeedCategoryProvider>
  );
}
