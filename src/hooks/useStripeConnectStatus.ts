import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { callEdgeFunction } from "@/infrastructure/api-client";

interface ConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export function useStripeConnectStatus(organiserProfileId: string | undefined) {
  const { user, loading: authLoading } = useAuth();
  return useQuery<ConnectStatus>({
    queryKey: ["stripe-connect-status", organiserProfileId, user?.id],
    queryFn: () =>
      callEdgeFunction<ConnectStatus>("stripe-connect-status", {
        body: { organiser_profile_id: organiserProfileId },
      }),
    enabled: !!organiserProfileId && !!user?.id && !authLoading,
    staleTime: 30_000,
  });
}
