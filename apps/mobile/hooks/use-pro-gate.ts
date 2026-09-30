import { router } from "expo-router";

import { usePro } from "@/contexts/pro-context";
import type { ProFeatureId } from "@/lib/pro/features";

/**
 * Gate for a Pro feature (one that needs the server). `requirePro` returns true
 * when the user is Pro; otherwise it opens the paywall with that feature
 * highlighted and returns false, so callers just `if (!requirePro(id)) return`.
 */
export function useProGate() {
  const { isPro } = usePro();

  const requirePro = (feature: ProFeatureId): boolean => {
    if (isPro) return true;
    router.push({ pathname: "/pro", params: { feature } });
    return false;
  };

  return { requirePro };
}
