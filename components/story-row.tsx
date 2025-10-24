import { HNItem } from "@/lib/hn-api";
import { timeAgo } from "@/lib/utils/time";
import { Button, Text, VStack } from "@expo/ui/swift-ui";
import { useRouter } from "expo-router";
import { useMemo } from "react";

interface StoryRowProps {
  story: HNItem;
  index: number;
}

export function StoryRow({ story, index }: StoryRowProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(
      `/story/${story.id}?title=${encodeURIComponent(story.title || "")}`
    );
  };

  const metadataText = useMemo(() => {
    return `${String(story.score || 0)} pts • ${
      story.by || "unknown"
    } • ${timeAgo(story.time || 0)} • ${String(
      story.descendants || 0
    )} comments`;
  }, [story.score, story.by, story.time, story.descendants]);

  return (
    <Button variant="plain" onPress={handlePress} role="default">
      <VStack spacing={4} alignment="leading">
        <Text size={16} weight="semibold" lineLimit={2}>
          {story.title || "Untitled"}
        </Text>

        <Text size={13} color="gray" lineLimit={1}>
          news.ycombinator.com
        </Text>

        <Text size={12} color="gray">
          {metadataText}
        </Text>
      </VStack>
    </Button>
  );
}
