import { MutationCache, QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient with mutation auto-invalidation.
 *
 * Mutations automatically invalidate all queries on success,
 * unless the mutation sets `meta.skipAutoInvalidation`.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.options.meta?.skipAutoInvalidation) {
        return;
      }
      queryClient.invalidateQueries();
    },
  }),
});
