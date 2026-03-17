import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import { useStripeConnectOnboard } from "@/hooks/useStripeConnectOnboard";

/**
 * Floating task pill shown to organisers when payouts are not yet set up.
 * Uses the same onboarding flow as PayoutSetupSection (stripe-connect-onboard redirect).
 */
const OrganiserPayoutTask = () => {
  const { user } = useAuth();
  const { activeProfile, isOrganiser, organiserProfiles } = useActiveProfile();
  const organiserProfileId = isOrganiser ? activeProfile?.id : organiserProfiles?.[0]?.id;
  const { data: connectStatus } = useStripeConnectStatus(organiserProfileId);
  const { startOnboarding, isOnboarding } = useStripeConnectOnboard(organiserProfileId);
  const [expanded, setExpanded] = useState(false);

  if (!user || !organiserProfileId) return null;
  if (connectStatus?.charges_enabled) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
      <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden max-w-[280px]">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Complete payout setup</span>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {expanded && (
          <div className="px-4 pb-4 pt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              Set up payouts to receive money from ticket sales.
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => startOnboarding()}
              disabled={isOnboarding}
            >
              {isOnboarding ? "Redirecting..." : "Set up payouts"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganiserPayoutTask;
