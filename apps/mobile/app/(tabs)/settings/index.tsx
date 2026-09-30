import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, Platform, Switch } from "react-native";

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
import { usePro } from "@/contexts/pro-context";
import { useTextSize } from "@/contexts/text-size-context";
import { useAppearanceSettings } from "@/hooks/use-appearance-settings";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useClearBookmarks } from "@/hooks/use-clear-bookmarks";
import { useExternalLink } from "@/hooks/use-external-link";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { useICloudSyncStatus } from "@/hooks/use-icloud-sync-status";
import { useMutes } from "@/hooks/use-mutes";
import { useReadStories } from "@/hooks/use-read-stories";
import { useReplyNotifications } from "@/hooks/use-reply-notifications";
import { useRestorePurchases } from "@/hooks/use-restore-purchases";
import { useTheme } from "@/hooks/use-theme";
import { confirmDestructive } from "@/lib/confirm-destructive";
import { timeAgoSpoken } from "@/lib/format/time";
import { hapticNotify, Haptics } from "@/lib/haptics";
import { reportError } from "@/lib/observability/report-error";
import { MANAGE_SUBSCRIPTIONS_URL } from "@/lib/pro/constants";
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
  const { colors } = useTheme();
  const sync = useICloudSyncStatus();
  const { isAvailable: proAvailable, isPro, deleteProData } = usePro();
  const { restorePurchases, isRestoring } = useRestorePurchases();
  const replyNotifications = useReplyNotifications();

  const deleteProDataWithFeedback = async () => {
    try {
      await deleteProData();
      await replyNotifications.forget();
      hapticNotify(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Pro data deleted", "Your server-side Pro data was removed.");
    } catch (error) {
      reportError(error, { operation: "pro.deleteData" });
      Alert.alert("Could not delete", "Please try again in a moment.");
    }
  };

  const storeUrl = Platform.select({
    ios: IOS_APP_STORE_URL,
    android: ANDROID_PLAY_STORE_URL,
    default: IOS_APP_STORE_URL,
  });

  return (
    <ScrollScreen gap={24}>
      {proAvailable ? (
        <ListSection
          title="Hacker Reader Pro"
          footer="Everything on your phone stays free. Pro pays for the servers."
        >
          {isPro ? (
            <ListRow
              leading={<IconTile name="pro" hue="orange" />}
              title="Pro, thank you"
              subtitle="Your subscription is active"
              chevron={false}
            />
          ) : (
            <ListRow
              leading={<IconTile name="pro" hue="orange" />}
              title="Get Hacker Reader Pro"
              subtitle="Notifications, summaries and sync"
              chevron
              onPress={() => router.push("/pro")}
            />
          )}
          {isPro && replyNotifications.isAvailable ? (
            <ListRow
              leading={<IconTile name="notifications" hue="orange" />}
              title="Reply notifications"
              subtitle="A push when someone replies to you"
              chevron={false}
              trailing={
                <Switch
                  value={replyNotifications.isOn}
                  disabled={replyNotifications.isBusy}
                  onValueChange={replyNotifications.setOn}
                  trackColor={{ true: colors.primary }}
                  accessibilityLabel="Reply notifications"
                />
              }
            />
          ) : null}
          {isPro ? (
            <ListRow
              leading={<IconTile name="payment" hue="gray" />}
              title="Manage Subscription"
              chevron
              onPress={() => openLink(MANAGE_SUBSCRIPTIONS_URL)}
            />
          ) : null}
          <ListRow
            leading={<IconTile name="refresh" hue="gray" />}
            title="Restore Purchases"
            disabled={isRestoring}
            chevron={false}
            onPress={() => void restorePurchases()}
          />
          <ListRow
            leading={<IconTile name="trash" hue="red" />}
            title="Delete Pro Data"
            chevron={false}
            onPress={() =>
              confirmDestructive({
                title: "Delete Pro Data",
                message:
                  "This removes what Pro stores on our servers for this install: your device details, push token and any Hacker News username you shared. Your subscription is not cancelled.",
                confirmLabel: "Delete",
                onConfirm: deleteProDataWithFeedback,
              })
            }
          />
        </ListSection>
      ) : null}

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
        footer={`${Platform.OS === "ios" ? "Bookmarks, read history, mutes and blocked users sync across your devices with iCloud. Nothing is sent to Hacker Reader's servers.\n\n" : ""}Clearing the cache removes the saved offline copies of stories and comments and reloads them from Hacker News. Bookmarks are kept.`}
      >
        {Platform.OS === "ios" && sync.isLoaded ? (
          <ListRow
            leading={<IconTile name="cloud" hue="blue" />}
            title="iCloud Sync"
            subtitle={
              !sync.available
                ? "iCloud unavailable"
                : sync.enabled && sync.lastSyncedAt
                  ? `Last synced ${timeAgoSpoken(sync.lastSyncedAt)}`
                  : undefined
            }
            trailing={
              <Switch
                value={sync.available && sync.enabled}
                disabled={!sync.available}
                onValueChange={sync.setEnabled}
                trackColor={{ true: colors.primary }}
                accessibilityLabel="iCloud Sync"
              />
            }
          />
        ) : null}
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
