/**
 * Pro Context
 *
 * Hacker Reader Pro is optional and only covers features that need a server.
 * This provider configures RevenueCat with the install id as the app user id,
 * tracks the `pro` entitlement and exposes purchase/restore. Without an API
 * key (dev, self-built, web) or a native module (Expo Go), Pro is unavailable
 * and the app works as before.
 */

import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";

import { useProDeviceSync } from "@/hooks/use-pro-device-sync";
import { reportError } from "@/lib/observability/report-error";
import { proApi } from "@/lib/pro/api";
import { hasProEntitlement } from "@/lib/pro/customer-info";
import { getInstallId } from "@/lib/pro/install-id";

export type PurchaseOutcome = "purchased" | "cancelled";

interface ProContextValue {
  /** False when Pro cannot be sold here (no key, not iOS, no native module). */
  isAvailable: boolean;
  isPro: boolean;
  /** True once the first entitlement check has finished (or Pro is unavailable). */
  isReady: boolean;
  offerings: PurchasesOfferings | null;
  /** The last offerings fetch failed. */
  offeringsError: boolean;
  /** Buys a package. Resolves "cancelled" if the user backs out; throws on failure. */
  purchase: (pkg: PurchasesPackage) => Promise<PurchaseOutcome>;
  /** Restores purchases; resolves whether Pro is now active. */
  restore: () => Promise<boolean>;
  /** Re-reads the entitlement and offerings. */
  refresh: () => Promise<void>;
  /** Deletes the server-side data for this install (DELETE /devices). */
  deleteProData: () => Promise<void>;
}

const ProContext = createContext<ProContextValue | null>(null);

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const PRO_SUPPORTED = Platform.OS === "ios" && Boolean(API_KEY);

let configured: Promise<void> | undefined;

/** Configures Purchases once per app run, with the install id as app user id. */
function ensureConfigured(): Promise<void> {
  configured ??= getInstallId().then((installId) => {
    Purchases.configure({ apiKey: API_KEY ?? "", appUserID: installId });
  });
  configured.catch(() => {
    configured = undefined;
  });
  return configured;
}

export function ProProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(PRO_SUPPORTED);
  const [isPro, setIsPro] = useState(false);
  const [isReady, setIsReady] = useState(!PRO_SUPPORTED);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [offeringsError, setOfferingsError] = useState(false);
  const deviceSyncPaused = useRef(false);

  useProDeviceSync(isPro, deviceSyncPaused);

  async function loadOfferings() {
    try {
      setOfferings(await Purchases.getOfferings());
      setOfferingsError(false);
    } catch (error) {
      setOfferingsError(true);
      reportError(error, { operation: "pro.getOfferings" });
    }
  }

  async function refresh() {
    if (!isAvailable) return;
    await ensureConfigured();
    try {
      setIsPro(hasProEntitlement(await Purchases.getCustomerInfo()));
    } catch (error) {
      reportError(error, { operation: "pro.getCustomerInfo" });
    }
    await loadOfferings();
  }

  useEffect(() => {
    if (!PRO_SUPPORTED) return;

    const onCustomerInfo = (info: CustomerInfo) =>
      setIsPro(hasProEntitlement(info));
    let listening = false;
    let cancelled = false;

    async function start() {
      try {
        await ensureConfigured();
        if (cancelled) return;
        Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
        listening = true;
        setIsPro(hasProEntitlement(await Purchases.getCustomerInfo()));
      } catch (error) {
        // No native module (Expo Go without preview mode) or no network.
        setIsAvailable(false);
        reportError(error, { operation: "pro.configure" });
      } finally {
        if (!cancelled) setIsReady(true);
      }
      await loadOfferings();
    }
    void start();

    return () => {
      cancelled = true;
      if (listening) Purchases.removeCustomerInfoUpdateListener(onCustomerInfo);
    };
  }, []);

  async function purchase(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
    const result = await Purchases.purchasePackage(pkg).then(
      (purchased) => purchased,
      (error: PurchasesError) => {
        if (error.userCancelled) return null;
        throw error;
      }
    );
    if (!result) return "cancelled";
    setIsPro(hasProEntitlement(result.customerInfo));
    return "purchased";
  }

  async function restore(): Promise<boolean> {
    const info = await Purchases.restorePurchases();
    const active = hasProEntitlement(info);
    setIsPro(active);
    return active;
  }

  async function deleteProData() {
    const installId = await getInstallId();
    await proApi.deleteProData(installId);
    deviceSyncPaused.current = true;
  }

  return (
    <ProContext.Provider
      value={{
        isAvailable,
        isPro,
        isReady,
        offerings,
        offeringsError,
        purchase,
        restore,
        refresh,
        deleteProData,
      }}
    >
      {children}
    </ProContext.Provider>
  );
}

export function usePro() {
  const context = use(ProContext);
  if (!context) {
    throw new Error("usePro must be used within ProProvider");
  }
  return context;
}
