import { useQuery } from "@tanstack/react-query";

import { hnKeys } from "@/lib/hn";
import { proApi } from "@/lib/pro/api";
import { getInstallId } from "@/lib/pro/install-id";
import type { StorySummary } from "@/lib/pro/summary";

/** The API answers 202 while another request is still generating. */
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 25;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The AI summary of a story (Pro). Generating can take 10-20 seconds, and a
 * request that arrives while another is generating gets 202, so the query
 * function polls until the summary is ready. Errors are not retried
 * automatically (each try can cost money); the sheet offers Try Again.
 */
export function useStorySummary(storyId: number) {
  return useQuery({
    queryKey: hnKeys.storySummary(storyId),
    queryFn: async ({ signal }): Promise<StorySummary> => {
      const installId = await getInstallId();
      for (let poll = 0; poll < MAX_POLLS; poll++) {
        const result = await proApi.getStorySummary(installId, storyId);
        if (result.status === "ready") return result.summary;
        await wait(POLL_INTERVAL_MS);
        if (signal.aborted) break;
      }
      throw new Error("Summary was not ready in time");
    },
    enabled: proApi.isConfigured && Number.isInteger(storyId) && storyId > 0,
    retry: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
