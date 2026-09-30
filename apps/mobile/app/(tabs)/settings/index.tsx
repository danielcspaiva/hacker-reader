import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Platform } from "react-native";

import {
  ListRow,
  ListSection,
  ListSlot,
  ScrollScreen,
  Segmented,
  Text,
  IconTile,
} from "@/components/ui";
import {
  ANDROID_PLAY_STORE_URL,
  APP_NAME,
  APP_VERSION,
  HN_GUIDELINES_URL,
  IOS_APP_STORE_URL,
  REPO_URL,
} from "@/constants/app-config";
import { useTextSize } from "@/contexts/text-size-context";
import { useAppearanceSettings } from "@/hooks/use-appearance-settings";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useClearBookmarks } from "@/hooks/use-clear-bookmarks";
import { useExternalLink } from "@/hooks/use-external-link";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { useMutes } from "@/hooks/use-mutes";
import { useReadStories } from "@/hooks/use-read-stories";
import { confirmDestructive } from "@/lib/confirm-destructive";
import { hapticNotify, Haptics } from "@/lib/haptics";
import { queryPersister } from "@/lib/query-cache/persister";
import { TEXT_SIZE_LABELS, TEXT_SIZES } from "@/lib/text/text-size";

const TEXT_SIZE_OPTIONS = TEXT_SIZES.map((value) => ({
  value,
  label: TEXT_SIZE_LABELS[value],
}));

/** The hooks report their own failures; here only success gets feedback. */
async function withSuccessHaptic(action: () => void | Promise<void>) {
  try {
    await action();
    hapticNotify(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Reported by the hook that owns the action.
  }
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { options, preference, setPreference } = useAppearanceSettings();
  const { textSize, setTextSize } = useTextSize();
  const { bookmarkCount, isClearing, clearAll } = useClearBookmarks();
  const { count: readCount, clearAll: clearReadHistory } = useReadStories();
  const { count: hiddenCount, clearAll: clearHiddenStories } =
    useHiddenStories();
  const { blockedUsers } = useBlockedUsers();
  const { mutes } = useMutes();
  const openLink = useExternalLink();

  const storeUrl = Platform.select({
    ios: IOS_APP_STORE_URL,
    android: ANDROID_PLAY_STORE_URL,
    default: IOS_APP_STORE_URL,
  });

  return (
    <ScrollScreen gap={24}>
      <ListSection title="Appearance">
        <ListSlot padding={12}>
          <Segmented
            options={options}
            value={preference}
            onChange={setPreference}
          />
        </ListSlot>
      </ListSection>

      <ListSection
        title="Text Size"
        footer="Scales story titles, story text and comments. Also follows your iPhone's text size."
      >
        <ListSlot padding={12}>
          <Segmented
            options={TEXT_SIZE_OPTIONS}
            value={textSize}
            onChange={setTextSize}
          />
        </ListSlot>
        <ListSlot padding={16}>
          <Text variant="callout" scalable tone="muted">
            The quick brown fox jumps over the lazy dog.
          </Text>
        </ListSlot>
      </ListSection>

      <ListSection title="Content & Safety">
        <ListRow
          leading={<IconTile name="document" hue="gray" />}
          title="Hacker News Guidelines"
          chevron
          onPress={() => openLink(HN_GUIDELINES_URL)}
        />
        <ListRow
          leading={<IconTile name="block" hue="gray" />}
          title="Blocked Users"
          value={
            blockedUsers.length > 0 ? String(blockedUsers.length) : undefined
          }
          chevron
          onPress={() => router.push("/(tabs)/settings/blocked-users")}
        />
        <ListRow
          leading={<IconTile name="mute" hue="gray" />}
          title="Muted Words & Sites"
          value={mutes.length > 0 ? String(mutes.length) : undefined}
          chevron
          onPress={() => router.push("/(tabs)/settings/mutes")}
        />
        <ListRow
          leading={<IconTile name="hide" hue="gray" />}
          title="Hidden Posts"
          value={hiddenCount > 0 ? String(hiddenCount) : "None"}
          disabled={hiddenCount === 0}
          chevron={false}
          onPress={() =>
            confirmDestructive({
              title: "Clear Hidden Posts",
              message: `Unhide all ${hiddenCount} hidden posts?`,
              confirmLabel: "Unhide All",
              onConfirm: () => withSuccessHaptic(clearHiddenStories),
            })
          }
        />
      </ListSection>

      <ListSection
        title="Data"
        footer="Clearing the cache removes the saved offline copies of stories and comments and reloads them from Hacker News. Bookmarks are kept."
      >
        <ListRow
          leading={<IconTile name="refresh" hue="gray" />}
          title="Clear Cache"
          chevron={false}
          onPress={() =>
            confirmDestructive({
              title: "Clear Cache",
              message:
                "This will clear all cached stories and comments, including the copies saved for offline reading. You'll need to reload them from Hacker News.",
              confirmLabel: "Clear",
              onConfirm: () =>
                withSuccessHaptic(async () => {
                  queryClient.clear();
                  await queryPersister.removeClient();
                }),
            })
          }
        />
        <ListRow
          leading={<IconTile name="trash" hue="red" />}
          title="Clear Bookmarks"
          value={bookmarkCount > 0 ? String(bookmarkCount) : undefined}
          destructive
          chevron={false}
          disabled={bookmarkCount === 0 || isClearing}
          onPress={() =>
            confirmDestructive({
              title: "Clear All Bookmarks",
              message: `Remove all ${bookmarkCount} bookmarks? This cannot be undone.`,
              confirmLabel: "Clear All",
              onConfirm: () => withSuccessHaptic(clearAll),
            })
          }
        />
        <ListRow
          leading={<IconTile name="trash" hue="red" />}
          title="Clear Reading History"
          value={readCount > 0 ? String(readCount) : undefined}
          destructive
          chevron={false}
          disabled={readCount === 0}
          onPress={() =>
            confirmDestructive({
              title: "Clear Reading History",
              message: `Forget ${readCount} read ${readCount === 1 ? "story" : "stories"}? They will no longer be dimmed and new-comment markers reset.`,
              confirmLabel: "Clear",
              onConfirm: () => withSuccessHaptic(clearReadHistory),
            })
          }
        />
      </ListSection>

      <ListSection title="Support">
        <ListRow
          leading={<IconTile name="code" hue="gray" />}
          title="Source Code"
          chevron
          onPress={() => openLink(REPO_URL)}
        />
        <ListRow
          leading={<IconTile name="favorite" hue="orange" />}
          title="Rate Hacker Reader"
          chevron
          onPress={() => openLink(storeUrl)}
        />
        <ListRow
          leading={<IconTile name="link" hue="orange" />}
          title="Built by dcsp.dev"
          chevron
          onPress={() => openLink("https://dcsp.dev")}
        />
      </ListSection>

      <Text variant="caption" tone="tertiary" style={{ textAlign: "center" }}>
        {APP_NAME} v{APP_VERSION}
      </Text>
    </ScrollScreen>
  );
}
