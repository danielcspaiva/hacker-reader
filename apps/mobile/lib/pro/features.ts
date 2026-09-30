import type { IconName } from "@/components/ui/icon-names";
import type { TileHue } from "@/constants/colors";

export type ProFeatureId =
  | "reply_notifications"
  | "keyword_alerts"
  | "ai_summaries"
  | "daily_digest"
  | "alternate_icons";

export interface ProFeature {
  id: ProFeatureId;
  title: string;
  description: string;
  icon: IconName;
  hue: TileHue;
  /** Later PRs flip a feature to "available" when it ships. */
  status: "available" | "coming_soon";
}

/** Everything Pro unlocks. Keep in step with `PRO_FEATURES` in `apps/api`. */
export const PRO_FEATURES: readonly ProFeature[] = [
  {
    id: "reply_notifications",
    title: "Reply notifications",
    description: "A push when someone replies to your comments or stories.",
    icon: "notifications",
    hue: "orange",
    status: "available",
  },
  {
    id: "keyword_alerts",
    title: "Keyword alerts",
    description: "Get notified when a story matches topics you follow.",
    icon: "keywordAlert",
    hue: "red",
    status: "coming_soon",
  },
  {
    id: "ai_summaries",
    title: "AI summaries",
    description: "Summaries of long threads and articles.",
    icon: "summary",
    hue: "indigo",
    status: "available",
  },
  {
    id: "daily_digest",
    title: "Daily digest",
    description: "The day's best stories in one morning notification.",
    icon: "digest",
    hue: "amber",
    status: "coming_soon",
  },
  {
    id: "alternate_icons",
    title: "Alternate app icons",
    description: "Pick a different icon for the home screen.",
    icon: "appIcons",
    hue: "pink",
    status: "available",
  },
];

export function isProFeatureId(
  value: string | undefined
): value is ProFeatureId {
  return PRO_FEATURES.some((feature) => feature.id === value);
}

/** The feature the user came from first, the rest in their usual order. */
export function orderFeatures(
  highlighted: ProFeatureId | undefined
): ProFeature[] {
  const first = PRO_FEATURES.filter((feature) => feature.id === highlighted);
  const rest = PRO_FEATURES.filter((feature) => feature.id !== highlighted);
  return [...first, ...rest];
}
