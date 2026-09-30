import { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { ErrorState } from "@/components/error-state";
import { ReplyCard } from "@/components/reply-card";
import {
  Card,
  EmptyState,
  IconTile,
  ListRow,
  ListScreen,
  ListSection,
  Skeleton,
} from "@/components/ui";
import { CARD_GAP } from "@/constants/theme";
import { useAnalytics } from "@/hooks/use-analytics";
import { useReplies } from "@/hooks/use-replies";
import { useRepliesSeen } from "@/hooks/use-replies-seen";
import { useReplyNotifications } from "@/hooks/use-reply-notifications";
import { useTheme } from "@/hooks/use-theme";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { countUnread, nextSeenAt, type ReplyEntry } from "@/lib/hn";

function ReplySkeleton() {
  return (
    <Card style={styles.skeletonCard}>
      <Skeleton width="30%" height={14} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="60%" height={12} />
    </Card>
  );
}

function NotifyToggle() {
  const { colors } = useTheme();
  const { isAvailable, isOn, isBusy, setOn } = useReplyNotifications();
  if (!isAvailable) return null;

  return (
    <View style={styles.toggle}>
      <ListSection footer="Hacker Reader Pro sends a push when someone replies to your stories or comments. Your Hacker News username is shared with our server only while this is on.">
        <ListRow
          leading={<IconTile name="notifications" hue="orange" />}
          title="Notify me of replies"
          chevron={false}
          trailing={
            <Switch
              value={isOn}
              disabled={isBusy}
              onValueChange={setOn}
              trackColor={{ true: colors.primary }}
              accessibilityLabel="Notify me of replies"
            />
          }
        />
      </ListSection>
    </View>
  );
}

export default function RepliesScreen() {
  const { data, isLoading, isError, isRefetching, refetch } = useReplies();
  const { isLoaded, seenAt, markSeen } = useRepliesSeen();
  const { track } = useAnalytics();

  // Unread dots are measured against the time of the previous visit, which is
  // then frozen so they stay visible while the screen is open.
  const [previousSeenAt, setPreviousSeenAt] = useState<number | null>(null);
  if (previousSeenAt === null && isLoaded) setPreviousSeenAt(seenAt ?? 0);

  const ready = previousSeenAt !== null && data !== undefined;

  useEffect(() => {
    if (!ready) return;
    track(AnalyticsEvent.REPLIES_VIEWED, {
      [AnalyticsProperty.REPLY_COUNT]: data.length,
      [AnalyticsProperty.UNREAD_REPLY_COUNT]: countUnread(data, previousSeenAt),
    });
    // Once per visit, when the first load completes.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const next = nextSeenAt(data, Math.floor(Date.now() / 1000));
    if (seenAt === undefined || next > seenAt) markSeen(next);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data]);

  return (
    <ListScreen<ReplyEntry>
      data={data ?? []}
      isLoading={isLoading || previousSeenAt === null}
      skeleton={<ReplySkeleton />}
      skeletonCount={4}
      keyExtractor={(entry) => entry.reply.id.toString()}
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      ListHeaderComponent={<NotifyToggle />}
      empty={
        isError ? (
          <ErrorState
            title="Couldn't load replies"
            onRetry={() => void refetch()}
          />
        ) : (
          <EmptyState
            icon="comments"
            title="No replies yet"
            message="Replies to your latest stories and comments will show up here."
          />
        )
      }
      renderItem={({ item }) => (
        <ReplyCard
          entry={item}
          unread={(item.reply.time ?? 0) > (previousSeenAt ?? 0)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    gap: 10,
    marginBottom: CARD_GAP,
  },
  toggle: {
    paddingBottom: 16,
  },
});
