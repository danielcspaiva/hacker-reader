import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTopStories,
  getNewStories,
  getAskStories,
  getShowStories,
  getJobStories,
  getItems,
  HNItem,
} from '@/lib/hn-api';
import { fetchOGMetadata } from '@/lib/og-api';

const PAGE_SIZE = 30;

export function useTopStories() {
  const queryClient = useQueryClient();

  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'top'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getTopStories(pageParam as number, PAGE_SIZE);
      const items = await getItems(ids);

      // Populate individual item caches for reuse across different views
      items.forEach(item => {
        queryClient.setQueryData(['item', item.id], item);
      });

      // Prefetch OG metadata for stories with URLs to avoid waterfall
      items.forEach(item => {
        if (item.url) {
          queryClient.prefetchQuery({
            queryKey: ['og-metadata', item.url],
            queryFn: ({ signal }) => fetchOGMetadata(item.url!, signal),
            staleTime: 60 * 60 * 1000, // 1 hour
          });
        }
      });

      return items;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    refetchOnWindowFocus: true, // Refresh when app comes back to foreground
  });
}

export function useNewStories() {
  const queryClient = useQueryClient();

  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'new'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getNewStories(pageParam as number, PAGE_SIZE);
      const items = await getItems(ids);

      // Populate individual item caches for reuse across different views
      items.forEach(item => {
        queryClient.setQueryData(['item', item.id], item);
      });

      // Prefetch OG metadata for stories with URLs to avoid waterfall
      items.forEach(item => {
        if (item.url) {
          queryClient.prefetchQuery({
            queryKey: ['og-metadata', item.url],
            queryFn: ({ signal }) => fetchOGMetadata(item.url!, signal),
            staleTime: 60 * 60 * 1000, // 1 hour
          });
        }
      });

      return items;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    refetchOnWindowFocus: true, // Refresh when app comes back to foreground
  });
}

export function useAskStories() {
  const queryClient = useQueryClient();

  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'ask'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getAskStories(pageParam as number, PAGE_SIZE);
      const items = await getItems(ids);

      // Populate individual item caches for reuse across different views
      items.forEach(item => {
        queryClient.setQueryData(['item', item.id], item);
      });

      // Prefetch OG metadata for stories with URLs to avoid waterfall
      items.forEach(item => {
        if (item.url) {
          queryClient.prefetchQuery({
            queryKey: ['og-metadata', item.url],
            queryFn: ({ signal }) => fetchOGMetadata(item.url!, signal),
            staleTime: 60 * 60 * 1000, // 1 hour
          });
        }
      });

      return items;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    refetchOnWindowFocus: true, // Refresh when app comes back to foreground
  });
}

export function useShowStories() {
  const queryClient = useQueryClient();

  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'show'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getShowStories(pageParam as number, PAGE_SIZE);
      const items = await getItems(ids);

      // Populate individual item caches for reuse across different views
      items.forEach(item => {
        queryClient.setQueryData(['item', item.id], item);
      });

      // Prefetch OG metadata for stories with URLs to avoid waterfall
      items.forEach(item => {
        if (item.url) {
          queryClient.prefetchQuery({
            queryKey: ['og-metadata', item.url],
            queryFn: ({ signal }) => fetchOGMetadata(item.url!, signal),
            staleTime: 60 * 60 * 1000, // 1 hour
          });
        }
      });

      return items;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    refetchOnWindowFocus: true, // Refresh when app comes back to foreground
  });
}

export function useJobStories() {
  const queryClient = useQueryClient();

  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ['stories', 'jobs'],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = await getJobStories(pageParam as number, PAGE_SIZE);
      const items = await getItems(ids);

      // Populate individual item caches for reuse across different views
      items.forEach(item => {
        queryClient.setQueryData(['item', item.id], item);
      });

      // Prefetch OG metadata for stories with URLs to avoid waterfall
      items.forEach(item => {
        if (item.url) {
          queryClient.prefetchQuery({
            queryKey: ['og-metadata', item.url],
            queryFn: ({ signal }) => fetchOGMetadata(item.url!, signal),
            staleTime: 60 * 60 * 1000, // 1 hour
          });
        }
      });

      return items;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    refetchOnWindowFocus: true, // Refresh when app comes back to foreground
  });
}
