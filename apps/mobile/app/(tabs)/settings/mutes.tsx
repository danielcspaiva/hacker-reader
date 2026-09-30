import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Button,
  EmptyState,
  Field,
  Icon,
  ListRow,
  ListSection,
  ListSlot,
  ScrollScreen,
  Segmented,
} from "@/components/ui";
import { useMutes } from "@/hooks/use-mutes";
import { useTheme } from "@/hooks/use-theme";
import { Haptics, hapticNotify } from "@/lib/haptics";
import { normalizeMuteValue, type Mute, type MuteKind } from "@/lib/hn";

const KIND_OPTIONS = [
  { value: "keyword", label: "Word" },
  { value: "domain", label: "Site" },
] as const;

export default function MutesScreen() {
  const { colors } = useTheme();
  const { mutes, addMute, removeMute } = useMutes();
  const [kind, setKind] = useState<MuteKind>("keyword");
  const [text, setText] = useState("");

  const keywords = mutes.filter((m) => m.kind === "keyword");
  const sites = mutes.filter((m) => m.kind === "domain");
  const canAdd = normalizeMuteValue(kind, text) !== null;

  const handleAdd = async () => {
    if (!canAdd) return;
    try {
      await addMute({ kind, value: text, source: "settings" });
      setText("");
      hapticNotify(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Reported by useMutes.
    }
  };

  const handleRemove = async (mute: Mute) => {
    try {
      await removeMute({ kind: mute.kind, value: mute.value });
      hapticNotify(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Reported by useMutes.
    }
  };

  const renderGroup = (title: string, items: Mute[]) =>
    items.length > 0 ? (
      <ListSection title={title}>
        {items.map((mute) => (
          <ListRow
            key={`${mute.kind}:${mute.value}`}
            title={mute.value}
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${mute.value}`}
                hitSlop={10}
                onPress={() => void handleRemove(mute)}
              >
                <Icon name="trash" size={18} color={colors.danger} />
              </Pressable>
            }
          />
        ))}
      </ListSection>
    ) : null;

  return (
    <ScrollScreen gap={24}>
      <ListSection
        title="Add"
        footer="Words match whole words in story titles, so “ai” hides “AI agents” but not “said”. A site also hides its subdomains. Muted stories are hidden from the feed only, not from search or bookmarks."
      >
        <ListSlot>
          <View style={styles.form}>
            <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />
            <Field
              placeholder={
                kind === "keyword" ? "Word or phrase" : "example.com"
              }
              value={text}
              onChangeText={setText}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={kind === "domain" ? "url" : "default"}
              returnKeyType="done"
              onSubmitEditing={() => void handleAdd()}
            />
            <Button
              label={kind === "keyword" ? "Mute word" : "Mute site"}
              icon="mute"
              fullWidth
              disabled={!canAdd}
              onPress={() => void handleAdd()}
            />
          </View>
        </ListSlot>
      </ListSection>
      {renderGroup("Keywords", keywords)}
      {renderGroup("Sites", sites)}
      {mutes.length === 0 ? (
        <EmptyState
          icon="mute"
          title="Nothing muted"
          message="Mute a word or a site, or use “Mute” on a story's menu."
        />
      ) : null}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
});
