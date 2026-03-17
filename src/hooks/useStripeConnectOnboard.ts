import { useState, useCallback } from "react";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { useToast } from "@/hooks/use-toast";

/**
 * Shared hook for starting the Stripe Connect onboarding flow.
 * Reuse this everywhere we need a "Set up payouts" touchpoint so the onboarding
 * experience is identical (redirects to Stripe's hosted flow).
 */
export function useStripeConnectOnboard(organiserProfileId: string | undefined) {
  const { toast } = useToast();
  const [onboarding, setOnboarding] = useState(false);

  const startOnboarding = useCallback(async () => {
    if (!organiserProfileId) {
      toast({ title: "Error", description: "No organiser profile selected.", variant: "destructive" });
      return;
    }
    setOnboarding(true);
    try {
      const result = await callEdgeFunction<{ url: string }>("stripe-connect-onboard", {
        body: { organiser_profile_id: organiserProfileId },
      });
      window.location.href = result.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start payout setup";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setOnboarding(false);
    }
  }, [organiserProfileId, toast]);

  return { startOnboarding, isOnboarding: onboarding };
}
