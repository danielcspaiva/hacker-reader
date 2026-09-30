import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { useFeedCategory } from "@/contexts/feed-category-context";
import { parseStoryCategory } from "@/lib/hn";

// Deep link `hnclient://feed/{category}` (the Top Stories widget's header and
// background): pick that category, then land on the feed.
export default function FeedCategoryLink() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { setCategory } = useFeedCategory();

  useEffect(() => {
    const parsed = parseStoryCategory(category);
    if (parsed) setCategory(parsed);
  }, [category, setCategory]);

  return <Redirect href="/(tabs)/feed" />;
}
