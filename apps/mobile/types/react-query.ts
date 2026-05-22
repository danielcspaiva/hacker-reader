import type { QueryKey } from "@tanstack/react-query";

// Let mutations declare exactly which query keys they invalidate via
// `meta.invalidates`, instead of blanket-invalidating every query in the app.
// The global MutationCache `onSuccess` in `app/_layout.tsx` reads this.
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      invalidates?: QueryKey[];
    };
  }
}
