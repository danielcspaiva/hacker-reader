import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import { PlanCard } from "@/components/pro/plan-card";
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  IconTile,
  ListRow,
  ListSection,
  Text,
} from "@/components/ui";
import { PRIVACY_URL } from "@/constants/app-config";
import { GUTTER, Radius } from "@/constants/theme";
import { usePro } from "@/contexts/pro-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useExternalLink } from "@/hooks/use-external-link";
import { useRestorePurchases } from "@/hooks/use-restore-purchases";
import { useTheme } from "@/hooks/use-theme";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { hapticNotify, Haptics } from "@/lib/haptics";
import { reportError } from "@/lib/observability/report-error";
import {
  MANAGE_SUBSCRIPTIONS_URL,
  TERMS_OF_USE_URL,
} from "@/lib/pro/constants";
import {
  isProFeatureId,
  orderFeatures,
  PRO_FEATURES,
} from "@/lib/pro/features";
import {
  pickPlans,
  planDisclosure,
  purchaseButtonLabel,
  summarizePlan,
  type PlanKind,
} from "@/lib/pro/plans";

type PaywallState = "unavailable" | "loading" | "pro" | "error" | "plans";

function paywallState(input: {
  isAvailable: boolean;
  isPro: boolean;
  isLoading: boolean;
  hasPlans: boolean;
}): PaywallState {
  if (!input.isAvailable) return "unavailable";
  if (input.isPro) return "pro";
  if (input.isLoading) return "loading";
  return input.hasPlans ? "plans" : "error";
}

function heroSubtitle(isPro: boolean, featureTitle: string | undefined) {
  if (isPro) return "Thank you for paying for the servers.";
  if (featureTitle) return `${featureTitle} is part of Pro.`;
  return "Reply alerts, summaries and sync: the features that need a server.";
}

export default function ProScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ feature?: string }>();
  const highlighted = isProFeatureId(params.feature)
    ? params.feature
    : undefined;
  const highlightedFeature = PRO_FEATURES.find((f) => f.id === highlighted);

  const {
    isAvailable,
    isPro,
    isReady,
    offerings,
    offeringsError,
    purchase,
    refresh,
  } = usePro();
  const analytics = useAnalytics();
  const openLink = useExternalLink();
  const { restorePurchases, isRestoring } = useRestorePurchases();

  const [selectedKind, setSelectedKind] = useState<PlanKind | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analytics.track(AnalyticsEvent.PAYWALL_VIEWED, { feature: highlighted });
    // Once per opening of the paywall.
    // eslint-disable-next-line react/exhaustive-deps
  }, []);

  const packages = offerings?.current?.availablePackages ?? [];
  const { annual, monthly } = pickPlans(packages);
  const plans = {
    annual: annual
      ? summarizePlan("annual", annual.product, { monthly: monthly?.product })
      : undefined,
    monthly: monthly ? summarizePlan("monthly", monthly.product) : undefined,
  };
  const kind: PlanKind = selectedKind ?? (annual ? "annual" : "monthly");
  const selectedPackage = kind === "annual" ? annual : monthly;
  const selectedPlan = plans[kind];

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    setError(null);
    analytics.track(AnalyticsEvent.PURCHASE_STARTED, { plan: kind });
    try {
      const outcome = await purchase(selectedPackage);
      if (outcome === "purchased") {
        analytics.track(AnalyticsEvent.PURCHASE_COMPLETED, { plan: kind });
        hapticNotify(Haptics.NotificationFeedbackType.Success);
      }
    } catch (purchaseError) {
      analytics.track(AnalyticsEvent.PURCHASE_FAILED, { plan: kind });
      reportError(purchaseError, { operation: "pro.purchase", plan: kind });
      setError("The purchase did not go through. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const state = paywallState({
    isAvailable,
    isPro,
    isLoading: !isReady || (!offerings && !offeringsError),
    hasPlans: Boolean(selectedPlan),
  });

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <View style={[styles.mark, { backgroundColor: colors.primary }]}>
          <Icon
            name="pro"
            size={40}
            weight="semibold"
            color={colors.primaryForeground}
          />
        </View>
        <Text variant="display" style={styles.center}>
          {isPro ? "You're Pro" : "Hacker Reader Pro"}
        </Text>
        <Text variant="body" tone="muted" style={styles.center}>
          {heroSubtitle(isPro, highlightedFeature?.title)}
        </Text>
      </View>

      {state === "unavailable" ? (
        <EmptyState
          fill={false}
          icon="offline"
          title="Pro isn't available"
          message="Subscriptions can't be purchased in this build."
        />
      ) : null}

      {state === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {state === "pro" ? (
        <Button
          label="Manage Subscription"
          variant="secondary"
          icon="payment"
          size="lg"
          fullWidth
          onPress={() => openLink(MANAGE_SUBSCRIPTIONS_URL)}
        />
      ) : null}

      {state === "error" ? (
        <EmptyState
          fill={false}
          icon="error"
          title="Couldn't load plans"
          message="Check your connection and try again."
          action={
            <Button
              label="Try Again"
              variant="secondary"
              onPress={() => void refresh()}
            />
          }
        />
      ) : null}

      {state === "plans" && selectedPlan ? (
        <View style={styles.plans}>
          {plans.annual ? (
            <PlanCard
              plan={plans.annual}
              selected={kind === "annual"}
              onPress={() => setSelectedKind("annual")}
            />
          ) : null}
          {plans.monthly ? (
            <PlanCard
              plan={plans.monthly}
              selected={kind === "monthly"}
              onPress={() => setSelectedKind("monthly")}
            />
          ) : null}
          {error ? (
            <Text
              accessibilityRole="alert"
              variant="callout"
              tone="destructive"
              style={styles.center}
            >
              {error}
            </Text>
          ) : null}
          <Button
            label={purchaseButtonLabel(selectedPlan)}
            size="lg"
            fullWidth
            loading={purchasing}
            disabled={isRestoring}
            onPress={() => void handlePurchase()}
          />
          <Text variant="caption" tone="muted" style={styles.center}>
            {planDisclosure(selectedPlan)}
          </Text>
        </View>
      ) : null}

      <ListSection title="What's included">
        {orderFeatures(highlighted).map((feature) => (
          <ListRow
            key={feature.id}
            leading={<IconTile name={feature.icon} hue={feature.hue} />}
            title={feature.title}
            subtitle={feature.description}
            trailing={
              feature.status === "coming_soon" ? (
                <Badge label="Coming soon" />
              ) : undefined
            }
          />
        ))}
      </ListSection>

      <View style={styles.footer}>
        <Text variant="callout" tone="muted" style={styles.center}>
          Everything on your phone stays free. Pro pays for the servers.
        </Text>
        {isAvailable && !isPro ? (
          <Button
            label="Restore Purchases"
            variant="ghost"
            loading={isRestoring}
            disabled={purchasing}
            onPress={() => void restorePurchases()}
          />
        ) : null}
        <Text variant="caption" tone="muted" style={styles.center}>
          <Text
            variant="caption"
            tone="primary"
            accessibilityRole="link"
            onPress={() => openLink(TERMS_OF_USE_URL)}
          >
            Terms of Use
          </Text>
          {"  ·  "}
          <Text
            variant="caption"
            tone="primary"
            accessibilityRole="link"
            onPress={() => openLink(PRIVACY_URL)}
          >
            Privacy Policy
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: GUTTER, paddingBottom: 40, gap: 24 },
  hero: { alignItems: "center", gap: 10, paddingTop: 8 },
  mark: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.card,
    borderCurve: "continuous",
    marginBottom: 6,
  },
  center: { textAlign: "center" },
  loading: { paddingVertical: 32, alignItems: "center" },
  plans: { gap: 12 },
  footer: { alignItems: "center", gap: 12 },
});
