/**
 * Keeps the server in step with the local reply-notifications opt-in: signing
 * out (or switching account) turns it off there, and a launch re-sends the push
 * token in case it changed. Mounted once in the root layout.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { usePro } from "@/contexts/pro-context";
import { replyNotificationsOptions } from "@/hooks/use-reply-notifications";
import { hnKeys } from "@/lib/hn";
import { setReplyNotifications } from "@/lib/hn/local/replies";
import { reportError } from "@/lib/observability/report-error";
import { ProApiError } from "@/lib/pro/api";
import {
  disableReplyNotifications,
  refreshReplyRegistration,
} from "@/lib/pro/reply-notifications";

export function useReplyNotificationsSync() {
  const { username, isLoading } = useHNAuth();
  const { isPro, isReady } = usePro();
  const queryClient = useQueryClient();
  const { data: entries } = useQuery(replyNotificationsOptions);
  const stored = entries?.[0]?.username;
  const signedOutOrSwitched = stored !== undefined && stored !== username;

  useEffect(() => {
    if (isLoading || !entries) return;

    if (signedOutOrSwitched) {
      disableReplyNotifications()
        .catch((error: unknown) => {
          // Not Pro any more (402): the server stops pushing by itself.
          if (!(error instanceof ProApiError && error.status === 402)) {
            throw error;
          }
        })
        .then(() => setReplyNotifications(null))
        .then(() => queryClient.setQueryData(hnKeys.replyNotifications(), []))
        .catch((error: Error) =>
          reportError(error, { operation: "replyNotificationsSignOut" })
        );
    }
  }, [isLoading, entries, signedOutOrSwitched, queryClient]);

  useEffect(() => {
    if (!stored || stored !== username || !isReady || !isPro) return;
    refreshReplyRegistration(stored).catch((error: Error) =>
      reportError(error, { operation: "refreshReplyRegistration" })
    );
  }, [stored, username, isReady, isPro]);
}
