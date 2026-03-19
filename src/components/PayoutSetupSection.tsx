import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { useStripeConnectOnboard } from "@/hooks/useStripeConnectOnboard";
import { useToast } from "@/hooks/use-toast";

interface PayoutSetupSectionProps {
  organiserProfileId: string;
  isOwner: boolean;
}

interface ConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

const PayoutSetupSection = ({ organiserProfileId, isOwner }: PayoutSetupSectionProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const { startOnboarding, isOnboarding } = useStripeConnectOnboard(organiserProfileId);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await callEdgeFunction<ConnectStatus>('stripe-connect-status', {
        body: { organiser_profile_id: organiserProfileId },
      });
      setStatus(result);
    } catch {
      setStatus({ connected: false, onboarding_complete: false, charges_enabled: false, payouts_enabled: false });
    } finally {
      setLoading(false);
    }
  }, [organiserProfileId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Check for return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_onboard') === 'complete') {
      // Remove query param
      window.history.replaceState({}, '', window.location.pathname);
      // Re-fetch status
      setLoading(true);
      fetchStatus();
    }
  }, [fetchStatus]);

  const handleOpenDashboard = async () => {
    setOpeningDashboard(true);
    try {
      const result = await callEdgeFunction<{ url: string }>('stripe-connect-dashboard', {
        body: { organiser_profile_id: organiserProfileId },
      });
      window.open(result.url, '_blank');
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to open payout dashboard", variant: "destructive" });
    } finally {
      setOpeningDashboard(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-tile-sm p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading payout status...</span>
        </div>
      </div>
    );
  }

  const isFullySetUp = status?.connected && status?.charges_enabled && status?.payouts_enabled;
  const isPending = status?.connected && !status?.charges_enabled;

  return (
    <div className="bg-card border border-border rounded-tile-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-foreground" />
          <h3 className="font-semibold text-foreground">Payouts</h3>
        </div>
        {isFullySetUp && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <CheckCircle className="h-3 w-3" /> Active
          </Badge>
        )}
        {isPending && (
          <Badge variant="outline" className="gap-1 text-xs border-yellow-500 text-yellow-600">
            <AlertCircle className="h-3 w-3" /> Pending
          </Badge>
        )}
      </div>

      {!status?.connected && (
        <>
          <p className="text-sm text-muted-foreground">
            Set up payouts to receive money from ticket sales. You'll need to verify your identity and add a bank account.
          </p>
          {isOwner ? (
            <Button onClick={() => startOnboarding()} disabled={isOnboarding} className="w-full">
              {isOnboarding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting...
                </>
              ) : (
                "Set Up Payouts"
              )}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Only the account owner can set up payouts.
            </p>
          )}
        </>
      )}

      {isPending && (
        <>
          <p className="text-sm text-muted-foreground">
            Your payout account is being reviewed. You may need to provide additional information.
          </p>
          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => startOnboarding()} disabled={isOnboarding} className="flex-1">
                {isOnboarding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue Setup"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setLoading(true); fetchStatus(); }}>
                <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </>
      )}

      {isFullySetUp && (
        <>
          <p className="text-sm text-muted-foreground">
            Payouts are active. Revenue from ticket sales will be deposited to your connected bank account.
          </p>
          {isOwner && (
            <Button variant="outline" onClick={handleOpenDashboard} disabled={openingDashboard} className="w-full">
              {openingDashboard ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              View Payout Dashboard
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default PayoutSetupSection;
