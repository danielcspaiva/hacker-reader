import { StoryListScreen } from '@/components/story-list-screen';
import { useAskStories } from '@/hooks/use-stories';

export default function AskStoriesScreen() {
  return <StoryListScreen title="Ask HN" useStoriesHook={useAskStories} />;
}
