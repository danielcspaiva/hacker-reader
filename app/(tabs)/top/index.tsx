import { StoryListScreen } from '@/components/story-list-screen';
import { useTopStories } from '@/hooks/use-stories';

export default function TopStoriesScreen() {
  return <StoryListScreen title="Top Stories" useStoriesHook={useTopStories} />;
}
