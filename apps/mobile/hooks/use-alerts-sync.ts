/**
 * Re-sends the push token and the keyword alerts to the server on launch (the
 * token can change, and the server copy expires after 45 days without a
 * registration). Pro only, and never prompts for permission. Mounted once in
 * the root layout.
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { usePro } from "@/contexts/pro-context";
import { alertsOptions } from "@/hooks/use-alerts";
import { reportError } from "@/lib/observability/report-error";
import { refreshAlertsRegistration } from "@/lib/pro/alerts";

export function useAlertsSync() {
  const { isPro, isReady } = usePro();
  const { data: alerts } = useQuery(alertsOptions);
  const hasAlerts = !!alerts && alerts.length > 0;

  useEffect(() => {
    if (!isReady || !isPro || !hasAlerts || !alerts) return;
    refreshAlertsRegistration(alerts).catch((error: Error) =>
      reportError(error, { operation: "refreshAlertsRegistration" })
    );
    // Once per launch (or when Pro / the first alert appears): adds and
    // removes register themselves.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isPro, hasAlerts]);
}
