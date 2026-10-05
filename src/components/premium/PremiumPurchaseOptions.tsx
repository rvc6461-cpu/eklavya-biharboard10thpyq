import { useEffect, useState } from "react";
import { Check, Crown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hasGooglePlayBillingBridge,
  restoreGooglePlayPurchase,
  startGooglePlayPurchase,
  type GooglePlayBillingResult,
} from "@/lib/premium/googlePlayBilling";

function resultMessage(result: GooglePlayBillingResult) {
  switch (result.status) {
    case "purchased":
      return "Google Play reported a purchase. Premium stays locked until server verification is connected.";
    case "pending":
      return "Your payment is pending in Google Play. Premium has not been unlocked.";
    case "cancelled":
      return "Purchase cancelled. No payment was completed.";
    case "already_purchased":
      return "Google Play found an existing purchase. Premium stays locked until server verification is connected.";
    case "failed":
      return "Google Play could not complete this request. Please try again later.";
    case "unavailable":
      return "Google Play Billing is not connected in this version. No payment will be taken and Premium will not be unlocked.";
  }
}

export function PremiumPurchaseOptions({ compact = false }: { compact?: boolean }) {
  const [billingAvailable, setBillingAvailable] = useState(false);
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setBillingAvailable(hasGooglePlayBillingBridge());
  }, []);

  async function run(action: "purchase" | "restore") {
    setBusy(action);
    const result = action === "purchase"
      ? await startGooglePlayPurchase()
      : await restoreGooglePlayPurchase();
    setNotice(resultMessage(result));
    setBillingAvailable(hasGooglePlayBillingBridge());
    setBusy(null);
  }

  return (
    <section className={compact ? "space-y-2" : "space-y-3 rounded-2xl border border-border bg-card p-4"}>
      {!compact && (
        <div>
          <p className="font-display text-sm font-bold">One-time purchase</p>
          <p className="text-xs text-muted-foreground">Premium access for this Google Play account after purchase verification.</p>
        </div>
      )}
      <Button
        type="button"
        className="w-full"
        disabled={busy !== null}
        onClick={() => void run("purchase")}
      >
        <Crown aria-hidden="true" />
        {busy === "purchase" ? "Checking Google Play…" : "Unlock Premium – ₹99"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy !== null}
        onClick={() => void run("restore")}
      >
        <RotateCcw aria-hidden="true" />
        {busy === "restore" ? "Checking purchase…" : "Restore / re-check purchase"}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">One-time payment · Not a subscription</p>
      <p className="text-center text-[11px] text-muted-foreground" role="status" aria-live="polite">
        {notice || (billingAvailable
          ? "Google Play Billing is available; Premium still requires verified purchase confirmation."
          : "Google Play Billing is not connected in this preview. No payment will be taken." )}
      </p>
    </section>
  );
}