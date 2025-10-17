import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getTopStories,
  getNewStories,
  getAskStories,
  getShowStories,
  getJobStories,
  getItems,
  HNItem,
} from '@/lib/hn-api';

const PAGE_SIZE = 30;

export function useTopStories() {
  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'top'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getTopStories(pageParam as number, PAGE_SIZE);
      return getItems(ids);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
  });
}

export function useNewStories() {
  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'new'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getNewStories(pageParam as number, PAGE_SIZE);
      return getItems(ids);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
  });
}

export function useAskStories() {
  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'ask'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getAskStories(pageParam as number, PAGE_SIZE);
      return getItems(ids);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
  });
}

export function useShowStories() {
  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'show'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getShowStories(pageParam as number, PAGE_SIZE);
      return getItems(ids);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
  });
}

export function useJobStories() {
  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'jobs'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getJobStories(pageParam as number, PAGE_SIZE);
      return getItems(ids);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
  });
}
