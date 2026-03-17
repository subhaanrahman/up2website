import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreditCard, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useStripeConnectOnboard } from "@/hooks/useStripeConnectOnboard";
import { eventsApi } from "@/api";
import { eventManagementRepository } from "@/features/events/repositories/eventManagementRepository";
import type { TicketTier } from "@/components/create-event/TicketTierModal";
import type { CohostEntry } from "@/components/create-event/EventDetailsForm";

interface DraftData {
  title: string;
  description?: string;
  location?: string;
  date: string;
  time?: string;
  capacity?: string;
  coverImage?: string | null;
  cohosts: CohostEntry[];
  reminders: string[];
  ticketTiers: TicketTier[];
  organiserProfileId?: string;
  publishAt?: string;
}

/**
 * Shown when user tries to create a paid event but hasn't completed Stripe Connect onboarding.
 * Uses the same onboarding flow as PayoutSetupSection (stripe-connect-onboard redirect).
 */
const OnboardingRequired = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeProfile, isOrganiser, organiserProfiles } = useActiveProfile();
  const organiserProfileId = isOrganiser ? activeProfile?.id : organiserProfiles?.[0]?.id;
  const { startOnboarding, isOnboarding } = useStripeConnectOnboard(organiserProfileId);
  const [saving, setSaving] = useState(false);

  const state = location.state as {
    draftData?: DraftData;
    fromCreate?: boolean;
  } | null;
  const fromCreate = state?.fromCreate ?? true;
  const draftData = state?.draftData;

  const handleSetUpPayouts = async () => {
    if (!organiserProfileId) {
      toast({ title: "Organiser profile required", description: "Switch to your business profile first.", variant: "destructive" });
      return;
    }
    try {
      await startOnboarding();
    } catch {
      // Error toast handled in hook
    }
  };

  const handleSaveDraft = async () => {
    if (!fromCreate || !draftData || !user) {
      navigate("/create");
      return;
    }
    const { title, description, location: loc, date, time, capacity: cap, coverImage, cohosts, reminders, ticketTiers, organiserProfileId: orgId, publishAt } = draftData;
    if (!title) {
      toast({ title: "Title required", description: "Event title is required for draft.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const eventDateTime = time ? `${date}T${time}:00` : `${date}T00:00:00`;
      const data = await eventsApi.create({
        title: title || "Untitled Event",
        description,
        location: loc,
        eventDate: eventDateTime,
        maxGuests: cap ? parseInt(cap) : undefined,
        isPublic: false,
        coverImage: coverImage || undefined,
        organiserProfileId: orgId,
        publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
      });
      const eventId = (data as { id?: string }).id;
      if (eventId) {
        if (cohosts?.length > 0) {
          await eventManagementRepository.insertCohosts(eventId, cohosts.map((c) => ({ id: c.id, type: c.type })));
        }
        if (reminders?.length > 0) {
          await eventManagementRepository.insertReminders(eventId, reminders);
        }
        const freeTiers = (ticketTiers || []).filter((t) => t.price === 0);
        if (freeTiers.length > 0) {
          await eventManagementRepository.upsertTicketTiers(
            eventId,
            freeTiers.map((t) => ({
              id: t.id,
              name: t.name,
              priceCents: 0,
              availableQuantity: t.availableQuantity,
            }))
          );
        }
      }
      toast({ title: "Draft saved", description: "Your event has been saved as a draft." });
      navigate(eventId ? `/events/${eventId}` : "/create");
    } catch {
      toast({ title: "Error", description: "Failed to save draft.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 p-2 rounded-full hover:bg-secondary transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5 text-foreground" />
      </button>

      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Complete payout setup
        </h1>
        <p className="text-sm text-muted-foreground">
          To create events with paid ticket tiers, you need to set up payouts. Stripe will verify your identity and connect your bank account.
        </p>

        <div className="space-y-3">
          <Button onClick={handleSetUpPayouts} className="w-full" size="lg" disabled={isOnboarding}>
            {isOnboarding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting...</> : "Set up payouts"}
          </Button>
          {fromCreate && (
            <Button variant="outline" onClick={handleSaveDraft} className="w-full" size="lg" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><FileText className="h-4 w-4 mr-2" /> Save as draft & complete later</>}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          You can also set up payouts from your organiser profile at any time.
        </p>
      </div>
    </div>
  );
};

export default OnboardingRequired;
