import { StoryListScreen } from '@/components/story-list-screen';
import { useNewStories } from '@/hooks/use-stories';

export default function NewStoriesScreen() {
  return <StoryListScreen title="New Stories" useStoriesHook={useNewStories} />;
}
