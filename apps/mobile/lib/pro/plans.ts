/** The slice of RevenueCat's store product the paywall prices from. */
export interface PlanProduct {
  price: number;
  priceString: string;
  pricePerMonthString: string | null;
  currencyCode: string;
  introPrice: {
    price: number;
    periodUnit: string;
    periodNumberOfUnits: number;
  } | null;
}

export interface PlanPackage {
  packageType: string;
  product: PlanProduct;
}

export type PlanKind = "annual" | "monthly";

const PACKAGE_TYPES: Record<PlanKind, string> = {
  annual: "ANNUAL",
  monthly: "MONTHLY",
};

export interface PlanChoices<P> {
  annual: P | undefined;
  monthly: P | undefined;
}

/** The annual and monthly packages of an offering; other packages are ignored. */
export function pickPlans<P extends PlanPackage>(
  packages: readonly P[]
): PlanChoices<P> {
  return {
    annual: packages.find((p) => p.packageType === PACKAGE_TYPES.annual),
    monthly: packages.find((p) => p.packageType === PACKAGE_TYPES.monthly),
  };
}

/** "7-day" for a free introductory period (Apple reports one week as WEEK 1). */
export function trialLabel(product: PlanProduct): string | null {
  const intro = product.introPrice;
  if (!intro || intro.price !== 0) return null;

  const units = intro.periodNumberOfUnits;
  switch (intro.periodUnit) {
    case "DAY":
      return `${units}-day`;
    case "WEEK":
      return units <= 2 ? `${units * 7}-day` : `${units}-week`;
    case "MONTH":
      return `${units}-month`;
    case "YEAR":
      return `${units}-year`;
    default:
      return null;
  }
}

/**
 * Yearly price spread over 12 months, formatted in the store currency. Falls
 * back to the store's own per-month string if the currency cannot be formatted.
 */
export function perMonthLabel(
  product: PlanProduct,
  locale?: string
): string | null {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: product.currencyCode,
    }).format(product.price / 12);
  } catch {
    return product.pricePerMonthString;
  }
}

/** Whole-number percent the annual plan saves against twelve months, or null. */
export function savingsPercent(
  annual: PlanProduct,
  monthly: PlanProduct
): number | null {
  if (monthly.price <= 0) return null;
  const percent = Math.round((1 - annual.price / (monthly.price * 12)) * 100);
  return percent > 0 ? percent : null;
}

export interface PlanSummary {
  kind: PlanKind;
  title: string;
  /** Store-formatted price with its period: "$19.99 / year". */
  priceLabel: string;
  /** Annual only: the per-month equivalent ("$1.67 / month"). */
  perMonth: string | null;
  trial: string | null;
  savings: number | null;
}

export function summarizePlan(
  kind: PlanKind,
  product: PlanProduct,
  options: { monthly?: PlanProduct; locale?: string } = {}
): PlanSummary {
  const annual = kind === "annual";
  const perMonth = annual ? perMonthLabel(product, options.locale) : null;
  return {
    kind,
    title: annual ? "Yearly" : "Monthly",
    priceLabel: `${product.priceString} / ${annual ? "year" : "month"}`,
    perMonth: perMonth ? `${perMonth} / month` : null,
    trial: trialLabel(product),
    savings:
      annual && options.monthly
        ? savingsPercent(product, options.monthly)
        : null,
  };
}

/** Button label: advertises the trial when the selected plan has one. */
export function purchaseButtonLabel(plan: PlanSummary): string {
  return plan.trial ? `Start ${plan.trial} free trial` : "Subscribe";
}

/** The fine print under the button, built from store data only. */
export function planDisclosure(plan: PlanSummary): string {
  const renews = plan.priceLabel.replace(" / ", "/");
  const cancel = "Cancel anytime in your Apple ID settings.";
  return plan.trial
    ? `${plan.trial} free trial, then ${renews}. ${cancel}`
    : `Renews at ${renews} until cancelled. ${cancel}`;
}
