/**
 * Re-sends the push token and delivery hour of a switched-on daily digest at
 * launch, in case the token changed. Mounted once in the root layout. The time
 * zone is refreshed by `useProDeviceSync`.
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { usePro } from "@/contexts/pro-context";
import { dailyDigestOptions } from "@/hooks/use-daily-digest";
import { reportError } from "@/lib/observability/report-error";
import { refreshDailyDigestRegistration } from "@/lib/pro/daily-digest";

export function useDailyDigestSync() {
  const { isPro, isReady } = usePro();
  const { data: entries } = useQuery(dailyDigestOptions);
  const stored = entries?.[0];
  const hour = stored?.enabled ? stored.hour : undefined;

  useEffect(() => {
    if (hour === undefined || !isReady || !isPro) return;
    refreshDailyDigestRegistration(hour).catch((error: Error) =>
      reportError(error, { operation: "refreshDailyDigestRegistration" })
    );
  }, [hour, isReady, isPro]);
}
