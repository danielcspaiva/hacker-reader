import { StoryListScreen } from '@/components/story-list-screen';
import { useShowStories } from '@/hooks/use-stories';

export default function ShowStoriesScreen() {
  return <StoryListScreen title="Show HN" useStoriesHook={useShowStories} />;
}
