export const PREMIUM_PRODUCT_ID = "eklavya_premium_99";
export const PREMIUM_PRODUCT_TYPE = "INAPP" as const;

export type GooglePlayBillingResult = {
  status:
    | "purchased"
    | "pending"
    | "cancelled"
    | "failed"
    | "already_purchased"
    | "unavailable";
};

export type GooglePlayBillingBridge = {
  purchase: (productId: string) => Promise<GooglePlayBillingResult>;
  restore: (productId: string) => Promise<GooglePlayBillingResult>;
};

declare global {
  interface Window {
    eklavyaGooglePlayBilling?: GooglePlayBillingBridge;
  }
}

function getBillingBridge() {
  if (typeof window === "undefined") return null;
  return window.eklavyaGooglePlayBilling ?? null;
}

export function hasGooglePlayBillingBridge() {
  return getBillingBridge() !== null;
}

export async function startGooglePlayPurchase(): Promise<GooglePlayBillingResult> {
  const bridge = getBillingBridge();
  if (!bridge) return { status: "unavailable" };

  try {
    return await bridge.purchase(PREMIUM_PRODUCT_ID);
  } catch {
    return { status: "failed" };
  }
}

export async function restoreGooglePlayPurchase(): Promise<GooglePlayBillingResult> {
  const bridge = getBillingBridge();
  if (!bridge) return { status: "unavailable" };

  try {
    return await bridge.restore(PREMIUM_PRODUCT_ID);
  } catch {
    return { status: "failed" };
  }
}