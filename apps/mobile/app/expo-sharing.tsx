import { router } from "expo-router";
import { useIncomingShare } from "expo-sharing";
import { useEffect, useRef } from "react";

import { Screen } from "@/components/ui";
import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { extractSharedLink } from "@/lib/format/url";

/**
 * Landing route of the share extension: it opens `hnclient://expo-sharing`
 * after writing the payload. Turns the shared link into the Discuss sheet
 * (which goes on to Submit when HN has no discussion). A share without a link
 * just goes home.
 */
export default function IncomingShareScreen() {
  const { sharedPayloads, clearSharedPayloads } = useIncomingShare();
  const analytics = useAnalytics();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const link = extractSharedLink(sharedPayloads);
    if (!link) {
      // The payload can arrive a tick after the route mounts.
      const timer = setTimeout(() => {
        if (!handled.current) router.replace("/");
      }, 1500);
      return () => clearTimeout(timer);
    }
    handled.current = true;
    analytics.track(AnalyticsEvent.SHARE_EXTENSION_OPENED);
    clearSharedPayloads();
    const params: Record<string, string> = { url: link.url };
    if (link.title) params.title = link.title;
    router.replace({ pathname: "/discuss", params });
    // `analytics` is recreated every render; the ref guards the one-shot work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedPayloads]);

  return <Screen>{null}</Screen>;
}
