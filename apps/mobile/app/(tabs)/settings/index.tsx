import { SwiftForm } from "@/components/swift-form";
import {
  ANDROID_PLAY_STORE_URL,
  APP_NAME,
  APP_VERSION,
  HN_GUIDELINES_URL,
  IOS_APP_STORE_URL,
  REPO_URL,
} from "@/constants/app-config";
import { useAppearanceSettings } from "@/hooks/use-appearance-settings";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useClearBookmarks } from "@/hooks/use-clear-bookmarks";
import { useExternalLink } from "@/hooks/use-external-link";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  Alert,
  Button,
  ConfirmationDialog,
  Picker,
  Section,
  Text,
} from "@expo/ui/swift-ui";
import {
  disabled,
  foregroundStyle,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";

type DialogButtonProps = {
  title: string;
  message: string;
  label: string;
  systemImage: SFSymbol;
  tint: string;
  confirmLabel?: string;
  destructive?: boolean;
  isDisabled?: boolean;
  onConfirm?: () => void;
};

function DialogButton({
  title,
  message,
  label,
  systemImage,
  tint,
  confirmLabel,
  destructive,
  isDisabled,
  onConfirm,
}: DialogButtonProps) {
  const [open, setOpen] = useState(false);
  const trigger = (
    <Button
      label={label}
      systemImage={systemImage}
      onPress={() => setOpen(true)}
      modifiers={[foregroundStyle(tint), disabled(!!isDisabled)]}
    />
  );
  const body = <Text>{message}</Text>;
  const actions = onConfirm ? (
    <>
      <Button label="Cancel" role="cancel" />
      <Button
        label={confirmLabel ?? "OK"}
        role={destructive ? "destructive" : "default"}
        onPress={onConfirm}
      />
    </>
  ) : (
    <Button label="OK" role="cancel" />
  );

  if (destructive && onConfirm) {
    return (
      <ConfirmationDialog
        title={title}
        isPresented={open}
        onIsPresentedChange={setOpen}
      >
        <ConfirmationDialog.Trigger>{trigger}</ConfirmationDialog.Trigger>
        <ConfirmationDialog.Message>{body}</ConfirmationDialog.Message>
        <ConfirmationDialog.Actions>{actions}</ConfirmationDialog.Actions>
      </ConfirmationDialog>
    );
  }

  return (
    <Alert title={title} isPresented={open} onIsPresentedChange={setOpen}>
      <Alert.Trigger>{trigger}</Alert.Trigger>
      <Alert.Message>{body}</Alert.Message>
      <Alert.Actions>{actions}</Alert.Actions>
    </Alert>
  );
}

export default function SettingsScreen() {
  const textColor = useThemeColor({}, "text");
  const queryClient = useQueryClient();
  const { options, preference, setPreference } = useAppearanceSettings();
  const { bookmarkCount, clearBookmarksLabel, isClearing, clearAll } =
    useClearBookmarks();
  const { count: hiddenCount, clearAll: clearHiddenStories } =
    useHiddenStories();
  const { blockedUsers } = useBlockedUsers();
  const openLink = useExternalLink();

  return (
    <SwiftForm>
      <Section title="Appearance">
        <Picker
          selection={preference}
          onSelectionChange={setPreference}
          modifiers={[pickerStyle("segmented")]}
        >
          {options.map((opt) => (
            <Text key={opt.value} modifiers={[tag(opt.value)]}>
              {opt.label}
            </Text>
          ))}
        </Picker>
      </Section>

      <Section title="Content & Safety">
        <Button
          onPress={() => openLink(HN_GUIDELINES_URL)}
          systemImage="doc.text"
          label="Hacker News Guidelines"
          modifiers={[foregroundStyle(textColor)]}
        />
        <Button
          onPress={() => router.push("/(tabs)/settings/blocked-users")}
          systemImage="person.fill.xmark"
          label={
            blockedUsers.length > 0
              ? `Blocked Users (${blockedUsers.length})`
              : "Blocked Users"
          }
          modifiers={[foregroundStyle(textColor)]}
        />
        <DialogButton
          title={hiddenCount === 0 ? "No Hidden Posts" : "Clear Hidden Posts"}
          message={
            hiddenCount === 0
              ? "You haven't hidden any posts yet."
              : `Unhide all ${hiddenCount} hidden posts?`
          }
          label={
            hiddenCount > 0 ? `Hidden Posts (${hiddenCount})` : "Hidden Posts"
          }
          systemImage="eye.slash"
          tint={textColor}
          confirmLabel="Clear All"
          destructive={hiddenCount > 0}
          onConfirm={hiddenCount > 0 ? clearHiddenStories : undefined}
        />
      </Section>

      <Section title="Data">
        <DialogButton
          title="Clear Cache"
          message="This will clear all cached stories and comments. You'll need to reload them from Hacker News."
          label="Clear Cache"
          systemImage="arrow.clockwise"
          tint={textColor}
          confirmLabel="Clear"
          destructive
          onConfirm={() => queryClient.clear()}
        />
        <DialogButton
          title={bookmarkCount === 0 ? "No Bookmarks" : "Clear All Bookmarks"}
          message={
            bookmarkCount === 0
              ? "You don't have any bookmarks to clear."
              : `Remove all ${bookmarkCount} bookmarks? This cannot be undone.`
          }
          label={clearBookmarksLabel}
          systemImage="trash"
          tint="red"
          confirmLabel="Clear All"
          destructive={bookmarkCount > 0}
          isDisabled={isClearing}
          onConfirm={bookmarkCount > 0 ? clearAll : undefined}
        />
      </Section>

      <Section title="Support">
        <Button
          onPress={() => openLink(REPO_URL)}
          systemImage="chevron.left.slash.chevron.right"
          label="Check Source Code"
          modifiers={[foregroundStyle(textColor)]}
        />
        <Button
          onPress={() =>
            openLink(
              Platform.select({
                ios: IOS_APP_STORE_URL,
                android: ANDROID_PLAY_STORE_URL,
                default: IOS_APP_STORE_URL,
              })
            )
          }
          systemImage="star"
          label="Rate Hacker Reader"
          modifiers={[foregroundStyle(textColor)]}
        />
      </Section>

      <Section title="About">
        <Button
          onPress={() => openLink("https://dcsp.dev")}
          systemImage="globe"
          label="Built by dcsp.dev"
          modifiers={[foregroundStyle(textColor)]}
        />
        <Button
          systemImage="info.circle"
          label={`${APP_NAME} v${APP_VERSION}`}
          modifiers={[foregroundStyle(textColor)]}
        />
      </Section>
    </SwiftForm>
  );
}
