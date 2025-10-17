import { useQuery } from '@tanstack/react-query';
import { getItem, HNItem } from '@/lib/hn-api';

export function useStory(id: number) {
  return useQuery<HNItem, Error>({
    queryKey: ['story', id],
    queryFn: () => getItem(id),
    enabled: !!id,
  });
}

export function useComment(id: number) {
  return useQuery<HNItem, Error>({
    queryKey: ['comment', id],
    queryFn: () => getItem(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes - comments don't change often
  });
}
