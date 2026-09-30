import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  Button,
  Card,
  Field,
  Icon,
  IconTile,
  ScrollScreen,
  Text,
} from "@/components/ui";
import { Radius, withAlpha } from "@/constants/theme";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useHNLogin } from "@/hooks/use-hn-login";
import { useSubmitStory } from "@/hooks/use-submit-story";
import { useTheme } from "@/hooks/use-theme";
import type { SubmitSource } from "@/lib/analytics/tracking";
import { HN_TITLE_MAX_LENGTH } from "@/lib/hn";

const SOURCES: readonly SubmitSource[] = ["feed_menu", "profile", "share"];

function asSource(value: string | undefined): SubmitSource {
  return SOURCES.find((source) => source === value) ?? "feed_menu";
}

/**
 * Submit a story to HN: title, then a URL or text. Prefills from the `url`
 * and `title` route params (the share flow).
 */
export default function SubmitScreen() {
  const { colors } = useTheme();
  const { isAuthenticated } = useHNAuth();
  const { handleLogin } = useHNLogin();
  const params = useLocalSearchParams<{
    url?: string;
    title?: string;
    source?: string;
  }>();
  const submission = useSubmitStory(asSource(params.source));

  const [title, setTitle] = useState(params.title ?? "");
  const [url, setUrl] = useState(params.url ?? "");
  const [text, setText] = useState("");
  const [duplicateOf, setDuplicateOf] = useState<number | null>(null);

  if (!isAuthenticated) {
    return (
      <ScrollScreen>
        <Card style={styles.signIn}>
          <IconTile name="compose" hue="orange" size={56} />
          <View style={styles.copy}>
            <Text variant="title" style={styles.center}>
              Sign in to submit
            </Text>
            <Text variant="callout" tone="muted" style={styles.center}>
              Submitting a story needs your Hacker News account.
            </Text>
          </View>
          <Button
            label="Sign in"
            icon="login"
            size="lg"
            fullWidth
            onPress={handleLogin}
          />
        </Card>
      </ScrollScreen>
    );
  }

  const overLimit = title.trim().length > HN_TITLE_MAX_LENGTH;
  const hasContent = url.trim().length > 0 || text.trim().length > 0;
  const canSubmit =
    title.trim().length > 0 &&
    hasContent &&
    !overLimit &&
    !submission.isPending;

  const handleSubmit = () => {
    setDuplicateOf(null);
    submission.mutate(
      { title, url, text },
      {
        onSuccess: (result) => {
          if (result.duplicateOf !== null) {
            setDuplicateOf(result.duplicateOf);
            return;
          }
          router.dismiss();
        },
      }
    );
  };

  const openExisting = (id: number) => {
    router.dismiss();
    router.push(`/story/${id}`);
  };

  return (
    <ScrollScreen gap={20}>
      {duplicateOf !== null ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.notice,
            { backgroundColor: withAlpha(colors.warning, 0.14) },
          ]}
        >
          <View style={styles.noticeRow}>
            <Icon name="warning" size={18} color={colors.warning} />
            <Text variant="callout" style={styles.flex}>
              This link was already submitted to Hacker News.
            </Text>
          </View>
          <Button
            label="Open existing discussion"
            variant="secondary"
            fullWidth
            onPress={() => openExisting(duplicateOf)}
          />
        </View>
      ) : null}

      <View style={styles.group}>
        <View style={styles.labelRow}>
          <Text variant="label" tone="muted">
            Title
          </Text>
          <Text
            variant="caption"
            tone={overLimit ? "destructive" : "muted"}
            numeric
            accessibilityLabel={`${title.trim().length} of ${HN_TITLE_MAX_LENGTH} characters`}
          >
            {title.trim().length}/{HN_TITLE_MAX_LENGTH}
          </Text>
        </View>
        <Field
          style={overLimit ? { borderColor: colors.danger } : undefined}
          placeholder="What is it about?"
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
          editable={!submission.isPending}
        />
      </View>

      <View style={styles.group}>
        <Text variant="label" tone="muted">
          URL
        </Text>
        <Field
          placeholder="https://"
          value={url}
          onChangeText={(value) => {
            setUrl(value);
            setDuplicateOf(null);
          }}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="URL"
          editable={!submission.isPending}
        />
      </View>

      <View style={styles.group}>
        <Text variant="label" tone="muted">
          Text
        </Text>
        <Field
          style={styles.textField}
          placeholder="Optional"
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          editable={!submission.isPending}
        />
        <Text variant="caption" tone="muted">
          Add a URL, or text to start a discussion. With both, Hacker News adds
          the text as a comment.
        </Text>
      </View>

      <Button
        label="Submit"
        size="lg"
        fullWidth
        loading={submission.isPending}
        disabled={!canSubmit && !submission.isPending}
        onPress={handleSubmit}
      />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  signIn: { alignItems: "center", gap: 16, paddingVertical: 32 },
  copy: { gap: 6 },
  group: { gap: 8 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textField: { height: 140, paddingTop: 12 },
  notice: {
    gap: 12,
    padding: 12,
    borderRadius: Radius.control,
    borderCurve: "continuous",
  },
  noticeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
