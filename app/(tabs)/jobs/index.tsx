import { StoryListScreen } from '@/components/story-list-screen';
import { useJobStories } from '@/hooks/use-stories';

export default function JobStoriesScreen() {
  return <StoryListScreen title="Jobs" useStoriesHook={useJobStories} />;
}
