import { useQuery } from "@tanstack/react-query";
import { callEdgeFunction } from "@/infrastructure/api-client";

interface ConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export function useStripeConnectStatus(organiserProfileId: string | undefined) {
  return useQuery<ConnectStatus>({
    queryKey: ["stripe-connect-status", organiserProfileId],
    queryFn: () =>
      callEdgeFunction<ConnectStatus>("stripe-connect-status", {
        body: { organiser_profile_id: organiserProfileId },
      }),
    enabled: !!organiserProfileId,
    staleTime: 30_000,
  });
}
