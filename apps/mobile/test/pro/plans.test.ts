import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasProEntitlement,
  type ProCustomerInfo,
} from "@/lib/pro/customer-info";
import {
  isProFeatureId,
  orderFeatures,
  PRO_FEATURES,
} from "@/lib/pro/features";
import {
  perMonthLabel,
  pickPlans,
  planDisclosure,
  purchaseButtonLabel,
  savingsPercent,
  summarizePlan,
  trialLabel,
  type PlanPackage,
  type PlanProduct,
} from "@/lib/pro/plans";

const annualProduct: PlanProduct = {
  price: 19.99,
  priceString: "$19.99",
  pricePerMonthString: "$1.67",
  currencyCode: "USD",
  introPrice: { price: 0, periodUnit: "WEEK", periodNumberOfUnits: 1 },
};
const monthlyProduct: PlanProduct = {
  price: 2.99,
  priceString: "$2.99",
  pricePerMonthString: "$2.99",
  currencyCode: "USD",
  introPrice: null,
};

describe("pickPlans", () => {
  it("finds the annual and monthly packages and ignores the rest", () => {
    const packages: PlanPackage[] = [
      { packageType: "LIFETIME", product: annualProduct },
      { packageType: "MONTHLY", product: monthlyProduct },
      { packageType: "ANNUAL", product: annualProduct },
    ];
    const { annual, monthly } = pickPlans(packages);
    assert.equal(annual?.packageType, "ANNUAL");
    assert.equal(monthly?.packageType, "MONTHLY");
  });

  it("returns undefined for a missing plan", () => {
    const { annual, monthly } = pickPlans([]);
    assert.equal(annual, undefined);
    assert.equal(monthly, undefined);
  });
});

describe("trialLabel", () => {
  const withIntro = (
    periodUnit: string,
    periodNumberOfUnits: number,
    price = 0
  ) => ({
    ...annualProduct,
    introPrice: { price, periodUnit, periodNumberOfUnits },
  });

  it("says 7-day for Apple's one-week trial", () => {
    assert.equal(trialLabel(annualProduct), "7-day");
    assert.equal(trialLabel(withIntro("DAY", 7)), "7-day");
  });

  it("handles other units", () => {
    assert.equal(trialLabel(withIntro("WEEK", 4)), "4-week");
    assert.equal(trialLabel(withIntro("MONTH", 1)), "1-month");
  });

  it("is null without a free intro offer", () => {
    assert.equal(trialLabel(monthlyProduct), null);
    assert.equal(trialLabel(withIntro("WEEK", 1, 0.99)), null);
    assert.equal(trialLabel(withIntro("FORTNIGHT", 1)), null);
  });
});

describe("prices", () => {
  it("computes the per-month equivalent from the store price", () => {
    assert.equal(perMonthLabel(annualProduct, "en-US"), "$1.67");
  });

  it("uses the store's own string if the currency cannot be formatted", () => {
    assert.equal(
      perMonthLabel({ ...annualProduct, currencyCode: "??" }, "en-US"),
      "$1.67"
    );
  });

  it("computes the savings against twelve months", () => {
    assert.equal(savingsPercent(annualProduct, monthlyProduct), 44);
    assert.equal(
      savingsPercent(annualProduct, { ...monthlyProduct, price: 0 }),
      null
    );
    assert.equal(
      savingsPercent(
        { ...annualProduct, price: 12 },
        { ...monthlyProduct, price: 1 }
      ),
      null
    );
  });
});

describe("summarizePlan", () => {
  it("summarizes the annual plan with trial, per month and savings", () => {
    const plan = summarizePlan("annual", annualProduct, {
      monthly: monthlyProduct,
      locale: "en-US",
    });
    assert.deepEqual(plan, {
      kind: "annual",
      title: "Yearly",
      priceLabel: "$19.99 / year",
      perMonth: "$1.67 / month",
      trial: "7-day",
      savings: 44,
    });
    assert.equal(purchaseButtonLabel(plan), "Start 7-day free trial");
    assert.equal(
      planDisclosure(plan),
      "7-day free trial, then $19.99/year. Cancel anytime in your Apple ID settings."
    );
  });

  it("summarizes the monthly plan without a trial", () => {
    const plan = summarizePlan("monthly", monthlyProduct);
    assert.equal(plan.priceLabel, "$2.99 / month");
    assert.equal(plan.perMonth, null);
    assert.equal(purchaseButtonLabel(plan), "Subscribe");
    assert.equal(
      planDisclosure(plan),
      "Renews at $2.99/month until cancelled. Cancel anytime in your Apple ID settings."
    );
  });
});

describe("hasProEntitlement", () => {
  it("is true only with an active pro entitlement", () => {
    const pro: ProCustomerInfo = {
      entitlements: { active: { pro: { isActive: true } } },
    };
    const other: ProCustomerInfo = {
      entitlements: { active: { other: { isActive: true } } },
    };
    const none: ProCustomerInfo = { entitlements: { active: {} } };
    assert.equal(hasProEntitlement(pro), true);
    assert.equal(hasProEntitlement(other), false);
    assert.equal(hasProEntitlement(none), false);
  });
});

describe("features", () => {
  it("has unique ids and a known status each", () => {
    const ids = PRO_FEATURES.map((feature) => feature.id);
    assert.equal(new Set(ids).size, 6);
    assert.ok(
      PRO_FEATURES.every(
        (f) => f.status === "available" || f.status === "coming_soon"
      )
    );
    assert.equal(
      PRO_FEATURES.find((f) => f.id === "reply_notifications")?.status,
      "available"
    );
  });

  it("puts the highlighted feature first", () => {
    assert.equal(orderFeatures("ai_summaries")[0]?.id, "ai_summaries");
    assert.equal(orderFeatures("ai_summaries").length, 6);
    assert.equal(orderFeatures(undefined)[0]?.id, PRO_FEATURES[0]?.id);
  });

  it("validates feature ids", () => {
    assert.equal(isProFeatureId("daily_digest"), true);
    assert.equal(isProFeatureId("nope"), false);
    assert.equal(isProFeatureId(undefined), false);
  });
});
