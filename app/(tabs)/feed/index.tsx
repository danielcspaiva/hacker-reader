import { type Category } from "@/components/category-filter";
import { StoryRow } from "@/components/story-row";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import {
  useAskStories,
  useJobStories,
  useNewStories,
  useShowStories,
  useTopStories,
} from "@/hooks/use-stories";
import {
  Button,
  CircularProgress,
  Host,
  List,
  Section,
  Text,
  VStack
} from "@expo/ui/swift-ui";
import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

const CATEGORY_LABELS: Record<Category, string> = {
  top: "Top Stories",
  new: "New Stories",
  ask: "Ask HN",
  show: "Show HN",
  jobs: "Jobs",
};

export default function FeedScreen() {
  const [category, setCategory] = useState<Category>("top");
  const { colorScheme } = useColorSchemeContext();

  // Call all hooks unconditionally at the top level
  const topStories = useTopStories();
  const newStories = useNewStories();
  const askStories = useAskStories();
  const showStories = useShowStories();
  const jobStories = useJobStories();

  // Select the appropriate query result based on category
  const queryResult = {
    top: topStories,
    new: newStories,
    ask: askStories,
    show: showStories,
    jobs: jobStories,
  }[category];

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    queryResult;

  const stories = data?.pages.flatMap((page) => page) ?? [];

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Stories",
            headerShown: true,
            headerLargeTitle: true,
          }}
        />
        <Host style={styles.centered} colorScheme={colorScheme}>
          <VStack spacing={16} alignment="center">
            <CircularProgress />
            <Text color="gray" size={14}>
              Loading stories...
            </Text>
          </VStack>
        </Host>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: CATEGORY_LABELS[category],
          headerShown: true,
          headerLargeTitle: true,
          headerBackButtonMenuEnabled: false,
          unstable_headerRightItems: () => [
            {
              type: "menu",
              label: category,
              icon: {
                type: "sfSymbol",
                name: "line.3.horizontal.decrease",
              },
              menu: {
                title: "stories",
                items: [
                  {
                    type: "action",
                    label: CATEGORY_LABELS.top,
                    icon: {
                      type: "sfSymbol",
                      name: "flame.fill",
                    },
                    state: category === "top" ? "on" : "off",
                    onPress: () => setCategory("top"),
                  },
                  {
                    type: "action",
                    label: CATEGORY_LABELS.new,
                    icon: {
                      type: "sfSymbol",
                      name: "sparkles",
                    },
                    state: category === "new" ? "on" : "off",
                    onPress: () => setCategory("new"),
                  },
                  {
                    type: "action",
                    label: CATEGORY_LABELS.ask,
                    icon: {
                      type: "sfSymbol",
                      name: "questionmark.circle.fill",
                    },
                    state: category === "ask" ? "on" : "off",
                    onPress: () => setCategory("ask"),
                  },
                  {
                    type: "action",
                    label: CATEGORY_LABELS.show,
                    icon: {
                      type: "sfSymbol",
                      name: "hand.raised.fill",
                    },
                    state: category === "show" ? "on" : "off",
                    onPress: () => setCategory("show"),
                  },
                  {
                    type: "action",
                    label: CATEGORY_LABELS.jobs,
                    icon: {
                      type: "sfSymbol",
                      name: "briefcase.fill",
                    },
                    state: category === "jobs" ? "on" : "off",
                    onPress: () => setCategory("jobs"),
                  },
                ],
              },
            },
          ],
        }}
      />
      <Host style={styles.listHost} colorScheme={colorScheme}>
        <List listStyle="insetGrouped">
          <Section>
            {stories.length === 0 ? (
              <VStack spacing={16} alignment="center">
                <Text color="gray" size={16}>
                  No stories found
                </Text>
              </VStack>
            ) : (
              stories.map((story, index) => (
                <StoryRow key={story.id} story={story} index={index + 1} />
                // <StoryCard key={story.id} story={story} index={index + 1} />
              ))
            )}

            {/* Load More Button */}
            {hasNextPage && (
              <VStack spacing={8} alignment="center">
                {isFetchingNextPage ? (
                  <>
                    <CircularProgress />
                    <Text color="gray" size={13}>
                      Loading more stories...
                    </Text>
                  </>
                ) : (
                  <Button
                    variant="glassProminent"
                    onPress={() => fetchNextPage()}
                    color="blue"
                  >
                    <Text color="white" weight="semibold">
                      Load More
                    </Text>
                  </Button>
                )}
              </VStack>
            )}
          </Section>
        </List>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listHost: {
    flex: 1,
  },
});
