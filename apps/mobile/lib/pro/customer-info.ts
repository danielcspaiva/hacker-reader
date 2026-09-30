import { PRO_ENTITLEMENT_ID } from "./constants";

/** The slice of RevenueCat's `CustomerInfo` the app reads. */
export interface ProCustomerInfo {
  entitlements: { active: { [entitlementId: string]: { isActive: boolean } } };
}

export function hasProEntitlement(info: ProCustomerInfo): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive === true;
}
