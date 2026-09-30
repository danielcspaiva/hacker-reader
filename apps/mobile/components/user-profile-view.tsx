import { Share, StyleSheet, View } from "react-native";

import { HTMLText } from "@/components/story/html-text";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  IconTile,
  INLINE_ICON_SIZE,
  ListRow,
  ListSection,
  Screen,
  ScrollScreen,
  Skeleton,
  Text,
} from "@/components/ui";
import { useExternalLink } from "@/hooks/use-external-link";
import { useTheme } from "@/hooks/use-theme";
import { useUser } from "@/hooks/use-user";
import { useUserSubmissions } from "@/hooks/use-user-submissions";
import { confirmDestructive } from "@/lib/confirm-destructive";
import { formatMemberSince } from "@/lib/format/time";
import { hapticImpact } from "@/lib/haptics";

interface UserProfileViewProps {
  userId: string | null;
  onOpenSubmissions: () => void;
  onLogout?: () => void;
}

function HeroSkeleton() {
  return (
    <Card style={styles.hero}>
      <Skeleton width={64} height={64} radius={32} />
      <Skeleton width="40%" height={22} />
      <Skeleton width="30%" height={44} />
      <Skeleton width="50%" height={14} />
    </Card>
  );
}

export function UserProfileView({
  userId,
  onOpenSubmissions,
  onLogout,
}: UserProfileViewProps) {
  const { colors } = useTheme();
  const openLink = useExternalLink();
  const { data: user, isLoading, isRefetching, refetch } = useUser(userId);
  const { data: submissions } = useUserSubmissions(user?.submitted);
  const submissionsCount = submissions?.length ?? 0;
  const hasSubmissions = (user?.submitted?.length ?? 0) > 0;

  if (!isLoading && !user) {
    return (
      <Screen>
        <EmptyState
          icon="block"
          title="User not found"
          message="This profile could not be loaded."
          action={
            <Button
              label="Try again"
              variant="secondary"
              onPress={() => void refetch()}
            />
          }
        />
      </Screen>
    );
  }

  const hnUrl = `https://news.ycombinator.com/user?id=${userId}`;

  const handleShare = () => {
    hapticImpact();
    void Share.share({ message: hnUrl, url: hnUrl });
  };

  const handleLogout = () => {
    confirmDestructive({
      title: "Sign out",
      message: "Are you sure you want to sign out of Hacker News?",
      confirmLabel: "Sign out",
      onConfirm: () => onLogout?.(),
    });
  };

  return (
    <ScrollScreen
      onRefresh={() => void refetch()}
      refreshing={isRefetching && !isLoading}
    >
      {isLoading || !user ? (
        <HeroSkeleton />
      ) : (
        <Card style={styles.hero}>
          <View
            style={[styles.avatar, { backgroundColor: colors.primaryWash }]}
          >
            <Text variant="title" tone="primary" weight="bold">
              {user.id.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text variant="title" numberOfLines={1}>
            {user.id}
          </Text>
          <View style={styles.karma}>
            <Text variant="hero" numeric>
              {user.karma.toLocaleString("en-US")}
            </Text>
            <Text variant="label" tone="muted">
              Karma
            </Text>
          </View>
          <View style={styles.since}>
            <Icon
              name="calendar"
              size={INLINE_ICON_SIZE.caption}
              color={colors.mutedForeground}
            />
            <Text variant="caption" tone="muted">
              Member since {formatMemberSince(user.created)}
            </Text>
          </View>
          {user.about ? (
            <View style={[styles.about, { borderTopColor: colors.separator }]}>
              <HTMLText html={user.about} variant="callout" />
            </View>
          ) : null}
        </Card>
      )}

      {user ? (
        <ListSection>
          {hasSubmissions ? (
            <ListRow
              title="Submissions"
              value={
                submissionsCount > 0
                  ? submissionsCount.toLocaleString("en-US")
                  : undefined
              }
              leading={<IconTile name="stories" hue="orange" />}
              onPress={onOpenSubmissions}
            />
          ) : null}
          <ListRow
            title="Open on Hacker News"
            leading={<IconTile name="external" hue="blue" />}
            onPress={() => void openLink(hnUrl)}
          />
          <ListRow
            title="Share profile"
            leading={<IconTile name="share" hue="green" />}
            onPress={handleShare}
          />
        </ListSection>
      ) : null}

      {user && onLogout ? (
        <ListSection>
          <ListRow
            title="Sign out"
            destructive
            chevron={false}
            leading={<IconTile name="logout" hue="red" />}
            onPress={handleLogout}
          />
        </ListSection>
      ) : null}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  karma: {
    alignItems: "center",
    gap: 2,
    marginTop: 8,
  },
  since: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  about: {
    alignSelf: "stretch",
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
