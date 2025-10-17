import { useQuery } from '@tanstack/react-query';
import {
  getTopStories,
  getNewStories,
  getAskStories,
  getShowStories,
  getJobStories,
  getItems,
  HNItem,
} from '@/lib/hn-api';

export function useTopStories(limit = 30) {
  return useQuery<HNItem[], Error>({
    queryKey: ['stories', 'top', limit],
    queryFn: async () => {
      const ids = await getTopStories(limit);
      return getItems(ids);
    },
  });
}

export function useNewStories(limit = 30) {
  return useQuery<HNItem[], Error>({
    queryKey: ['stories', 'new', limit],
    queryFn: async () => {
      const ids = await getNewStories(limit);
      return getItems(ids);
    },
  });
}

export function useAskStories(limit = 30) {
  return useQuery<HNItem[], Error>({
    queryKey: ['stories', 'ask', limit],
    queryFn: async () => {
      const ids = await getAskStories(limit);
      return getItems(ids);
    },
  });
}

export function useShowStories(limit = 30) {
  return useQuery<HNItem[], Error>({
    queryKey: ['stories', 'show', limit],
    queryFn: async () => {
      const ids = await getShowStories(limit);
      return getItems(ids);
    },
  });
}

export function useJobStories(limit = 30) {
  return useQuery<HNItem[], Error>({
    queryKey: ['stories', 'jobs', limit],
    queryFn: async () => {
      const ids = await getJobStories(limit);
      return getItems(ids);
    },
  });
}
