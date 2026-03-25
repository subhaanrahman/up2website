import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Ticket, ClipboardList, Bell, FileText } from "lucide-react";
import { DateTimePicker } from "@/components/create-event/DateTimePicker";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useCreateEvent } from "@/hooks/useEventsQuery";
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import { useStripeConnectOnboard } from "@/hooks/useStripeConnectOnboard";
import EventDetailsForm, { type CohostEntry } from "@/components/create-event/EventDetailsForm";
import TicketingPanel from "@/components/create-event/TicketingPanel";
import GuestlistPanel from "@/components/create-event/GuestlistPanel";
import NotificationsPanel from "@/components/create-event/NotificationsPanel";
import type { TicketTier } from "@/components/create-event/TicketTierModal";
import type { DiscountCode } from "@/components/create-event/DiscountCodeModal";
import type { VipTableTier } from "@/components/create-event/VipTableTierModal";
import { eventManagementRepository } from "@/features/events/repositories/eventManagementRepository";
import { AppError } from "@/infrastructure/errors";
import { supabase } from "@/infrastructure/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BottomTab = "details" | "ticketing" | "guestlist" | "notifications";

const LAST_ORG_FOR_EVENT_CREATE_KEY = "lastOrganiserForEventCreate";

function edgeErrorMessage(err: unknown): string {
  if (err instanceof AppError) {
    const base = err.message;
    if (err.statusCode === 401) {
      return `${base} If you changed .env, sign out and sign in so your session matches this Supabase project.`;
    }
    return base;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

function parseRefundDeadlineHoursInput(s: string): number | null | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0 || n > 168) return undefined;
  return n;
}

/** Edge returns the inserted row; ensure we never navigate with a bad/missing id (avoids ErrorBoundary + bad queries). */
function extractCreatedEventId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const id = (payload as Record<string, unknown>).id;
  if (typeof id !== "string") return undefined;
  const t = id.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)) return t;
  return undefined;
}

const CreateEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const { activeProfile, isOrganiser, organiserProfiles, isLoading: profileLoading } = useActiveProfile();
  const createEventMutation = useCreateEvent();

  const [activeTab, setActiveTab] = useState<BottomTab>("details");
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [formErrors, setFormErrors] = useState<{ title?: string; date?: string; venueName?: string; address?: string }>({});

  // Details state
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [cohosts, setCohosts] = useState<CohostEntry[]>([]);
  const [cohostInput, setCohostInput] = useState("");

  // Ticketing state
  const [capacity, setCapacity] = useState("");
  const [showRemaining, setShowRemaining] = useState(false);
  const [discountsEnabled, setDiscountsEnabled] = useState(false);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [vipTableTiers, setVipTableTiers] = useState<VipTableTier[]>([]);
  const [ticketsAvailableFrom, setTicketsAvailableFrom] = useState("");
  const [ticketsAvailableUntil, setTicketsAvailableUntil] = useState("");
  const [soldOutMessageEnabled, setSoldOutMessageEnabled] = useState(false);
  const [soldOutMessage, setSoldOutMessage] = useState("");
  const [vipTablesEnabled, setVipTablesEnabled] = useState(false);
  const [refundsEnabled, setRefundsEnabled] = useState(false);
  const [refundDeadlineHours, setRefundDeadlineHours] = useState("");
  const [refundPolicyText, setRefundPolicyText] = useState("");

  // Guestlist state
  const [guestlistEnabled, setGuestlistEnabled] = useState(true);
  const [guestlistDeadline, setGuestlistDeadline] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [guestlistCapacity, setGuestlistCapacity] = useState("");

  // Notifications state
  const [reminders, setReminders] = useState<string[]>(["1_day"]);

  /** When personal + multiple orgs, which organiser this event is for (persisted in localStorage). */
  const [orgPickerId, setOrgPickerId] = useState<string | null>(null);

  useEffect(() => {
    if (organiserProfiles.length <= 1) {
      setOrgPickerId(null);
      return;
    }
    if (activeProfile?.type !== "personal") {
      setOrgPickerId(null);
      return;
    }
    const stored = localStorage.getItem(LAST_ORG_FOR_EVENT_CREATE_KEY);
    const valid =
      stored && organiserProfiles.some((o) => o.id === stored) ? stored : organiserProfiles[0]?.id;
    setOrgPickerId(valid ?? null);
  }, [organiserProfiles, activeProfile?.type, activeProfile?.id]);

  // Ticketing when using an organiser profile, or when personal but an organiser is selected for this event
  const hasOrganiserProfile = isOrganiser || !!eventOrganiserProfileId;

  // Venue / host association: explicit organiser session, single org default, or picker + last-used when personal + multiple orgs
  const eventOrganiserProfileId = useMemo(() => {
    if (activeProfile?.type === "organiser") return activeProfile.id;
    if (organiserProfiles.length === 0) return undefined;
    if (organiserProfiles.length === 1) return organiserProfiles[0]!.id;
    return orgPickerId ?? organiserProfiles[0]!.id;
  }, [activeProfile, organiserProfiles, orgPickerId]);

  // Stripe Connect: same organiser as the event being created (including personal + selected org for paid tiers)
  const stripeConnectOrganiserId =
    activeProfile?.type === "organiser" ? activeProfile.id : eventOrganiserProfileId;
  const { data: connectStatus } = useStripeConnectStatus(stripeConnectOrganiserId);
  const payoutsReady = connectStatus?.charges_enabled ?? false;
  const { startOnboarding } = useStripeConnectOnboard(stripeConnectOrganiserId);

  const hasData = title || date || venueName || address || description;

  const handleClose = () => {
    if (hasData) {
      setExitDialogOpen(true);
    } else {
      navigate(-1);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !title) {
      navigate(-1);
      return;
    }

    const eventDateTime = time ? `${date || new Date().toISOString().split("T")[0]}T${time}:00` : `${date || new Date().toISOString().split("T")[0]}T00:00:00`;

    try {
      const { data: { user: freshUser }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !freshUser) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Session not ready",
          description: "No access token. Sign out and sign in again, or check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are from the same project.",
          variant: "destructive",
        });
        return;
      }

      await createEventMutation.mutateAsync({
        title: title || "Untitled Event",
        description: description || undefined,
        venueName: venueName || undefined,
        address: address || undefined,
        eventDate: eventDateTime,
        maxGuests: capacity ? parseInt(capacity) : undefined,
        isPublic: false, // draft events are private
        coverImage: coverImage || undefined,
        organiserProfileId: eventOrganiserProfileId,
        vipTablesEnabled,
        refundsEnabled,
        refundPolicyText: refundPolicyText.trim() || undefined,
        refundDeadlineHoursBeforeEvent: parseRefundDeadlineHoursInput(refundDeadlineHours),
      });
      toast({ title: "Draft saved", description: "Your event has been saved as a draft." });
      navigate(-1);
    } catch (e) {
      toast({ title: "Error", description: edgeErrorMessage(e), variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to create an event", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!title || !date || !venueName || !address) {
      setFormErrors({
        title: !title ? "Event title is required" : undefined,
        date: !date ? "Date is required" : undefined,
        venueName: !venueName ? "Venue name is required" : undefined,
        address: !address ? "Address is required" : undefined,
      });
      setActiveTab("details");
      return;
    }
    setFormErrors({});

    const { data: { user: freshUser }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !freshUser) {
      toast({
        title: "Session expired",
        description: "Your login may be invalid for this project. Sign in again.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({
        title: "Session not ready",
        description: "No access token. Sign out and sign in again, or check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are from the same project.",
        variant: "destructive",
      });
      return;
    }

    const eventDateTime = time ? `${date}T${time}:00` : `${date}T00:00:00`;

    // Gate: paid tiers require Stripe Connect onboarding
    const hasPaidTiers = ticketTiers.some((t) => t.price > 0);
    const hasVipTables = vipTablesEnabled;
    if ((hasPaidTiers || hasVipTables) && !payoutsReady) {
      navigate("/create/onboarding-required", {
        state: {
          fromCreate: true,
          draftData: {
            title,
            description,
            venueName,
            address,
            date,
            time,
            capacity,
            coverImage,
            cohosts,
            reminders,
            ticketTiers,
            vipTablesEnabled,
            vipTableTiers,
            organiserProfileId: eventOrganiserProfileId,
            publishAt,
          },
        },
      });
      return;
    }

    try {
      const data = await createEventMutation.mutateAsync({
        title,
        description: description || undefined,
        venueName,
        address,
        eventDate: eventDateTime,
        maxGuests: capacity ? parseInt(capacity) : undefined,
        coverImage: coverImage || undefined,
        organiserProfileId: eventOrganiserProfileId,
        publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
        ticketsAvailableFrom: ticketsAvailableFrom ? new Date(ticketsAvailableFrom).toISOString() : undefined,
        ticketsAvailableUntil: ticketsAvailableUntil ? new Date(ticketsAvailableUntil).toISOString() : undefined,
        vipTablesEnabled,
        refundsEnabled,
        refundPolicyText: refundPolicyText.trim() || undefined,
        refundDeadlineHoursBeforeEvent: parseRefundDeadlineHoursInput(refundDeadlineHours),
      });

      const eventId = extractCreatedEventId(data);
      if (!eventId) {
        toast({
          title: publishAt ? "Event scheduled!" : "Event created!",
          description: "Your event was saved. Open Tickets or Profile to view it.",
        });
        navigate("/events");
        return;
      }

      // Save cohosts to event_cohosts table
      if (cohosts.length > 0 && eventId) {
        await eventManagementRepository.insertCohosts(eventId, cohosts.map(c => ({ id: c.id, type: c.type })));
      }

      // Save reminder preferences to event_reminders table
      if (reminders.length > 0 && eventId) {
        await eventManagementRepository.insertReminders(eventId, reminders);
      }

      // Save ticket tiers (map UI format: price in R, to DB: price_cents)
      if (ticketTiers.length > 0 && eventId) {
        await eventManagementRepository.upsertTicketTiers(
          eventId,
          ticketTiers.map((t) => ({
            id: t.id,
            name: t.name,
            priceCents: Math.round(t.price * 100),
            availableQuantity: t.availableQuantity,
          }))
        );
      }

      if (vipTablesEnabled && vipTableTiers.length > 0 && eventId) {
        await eventManagementRepository.upsertVipTableTiers(
          eventId,
          vipTableTiers.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description ?? null,
            minSpendCents: Math.round(t.minSpend * 100),
            availableQuantity: t.availableQuantity,
            maxGuests: t.maxGuests,
            includedItems: t.includedItems,
          }))
        );
      }

      toast({
        title: publishAt ? "Event scheduled!" : "Event created!",
        description: publishAt ? "Your event will publish at the scheduled time." : "Your event has been created successfully.",
      });
      navigate(`/events/${eventId}`);
    } catch (e) {
      toast({ title: "Error", description: edgeErrorMessage(e), variant: "destructive" });
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const tabs: { key: BottomTab; label: string; icon: React.ReactNode }[] = [
    // Only business (organiser) accounts can access ticketing
    ...(hasOrganiserProfile ? [{ key: "ticketing" as BottomTab, label: "Ticketing", icon: <Ticket className="h-5 w-5" /> }] : []),
    { key: "guestlist", label: "Guestlist", icon: <ClipboardList className="h-5 w-5" /> },
    { key: "notifications", label: "Notifications", icon: <Bell className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase">New Event</h1>
          <span className="w-9" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="container mx-auto px-4 max-w-lg py-5">
          {!hasOrganiserProfile && (
            <div className="mb-4 rounded-tile border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Ticketing &amp; sale windows</span> are available when you use an organiser profile. Open{" "}
              <Link to="/profile" className="text-primary underline underline-offset-2">
                Profile
              </Link>{" "}
              and switch profiles to set prices, VIP tables, and when tickets go on sale.
            </div>
          )}
          {activeProfile?.type === "personal" && organiserProfiles.length > 1 && orgPickerId && (
            <div className="mb-4 space-y-1.5">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Create for organisation</p>
              <Select
                value={orgPickerId}
                onValueChange={(v) => {
                  setOrgPickerId(v);
                  localStorage.setItem(LAST_ORG_FOR_EVENT_CREATE_KEY, v);
                }}
              >
                <SelectTrigger className="w-full rounded-tile bg-card border-border/50">
                  <SelectValue placeholder="Select organiser" />
                </SelectTrigger>
                <SelectContent>
                  {organiserProfiles.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.displayName} @{o.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ticketing and branding use this organiser. Last used is remembered when you switch profiles.
              </p>
            </div>
          )}
          {activeTab === "details" && (
            <EventDetailsForm
              title={title} setTitle={setTitle}
              coverImage={coverImage} setCoverImage={setCoverImage}
              date={date} setDate={setDate}
              time={time} setTime={setTime}
              venueName={venueName} setVenueName={setVenueName}
              address={address} setAddress={setAddress}
              description={description} setDescription={setDescription}
              cohosts={cohosts} setCohosts={setCohosts}
              cohostInput={cohostInput} setCohostInput={setCohostInput}
              errors={formErrors}
            />
          )}
          {activeTab === "ticketing" && (
            <TicketingPanel
              capacity={capacity} setCapacity={setCapacity}
              showRemaining={showRemaining} setShowRemaining={setShowRemaining}
              discountsEnabled={discountsEnabled} setDiscountsEnabled={setDiscountsEnabled}
              discountCodes={discountCodes} setDiscountCodes={setDiscountCodes}
              ticketTiers={ticketTiers} setTicketTiers={setTicketTiers}
              vipTableTiers={vipTableTiers} setVipTableTiers={setVipTableTiers}
              ticketsAvailableFrom={ticketsAvailableFrom} setTicketsAvailableFrom={setTicketsAvailableFrom}
              soldOutMessageEnabled={soldOutMessageEnabled} setSoldOutMessageEnabled={setSoldOutMessageEnabled}
              soldOutMessage={soldOutMessage} setSoldOutMessage={setSoldOutMessage}
              vipTablesEnabled={vipTablesEnabled} setVipTablesEnabled={setVipTablesEnabled}
              refundsEnabled={refundsEnabled} setRefundsEnabled={setRefundsEnabled}
              refundDeadlineHours={refundDeadlineHours} setRefundDeadlineHours={setRefundDeadlineHours}
              refundPolicyText={refundPolicyText} setRefundPolicyText={setRefundPolicyText}
              payoutsReady={payoutsReady}
              organiserProfileId={stripeConnectOrganiserId}
              onStartOnboarding={startOnboarding}
            />
          )}
          {activeTab === "guestlist" && (
            <GuestlistPanel
              guestlistEnabled={guestlistEnabled} setGuestlistEnabled={setGuestlistEnabled}
              guestlistDeadline={guestlistDeadline} setGuestlistDeadline={setGuestlistDeadline}
              requireApproval={requireApproval} setRequireApproval={setRequireApproval}
              guestlistCapacity={guestlistCapacity} setGuestlistCapacity={setGuestlistCapacity}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsPanel reminders={reminders} setReminders={setReminders} />
          )}

          {/* Schedule + publish on details tab */}
          {activeTab === "details" && (
            <div className="pt-3 space-y-3">
              <DateTimePicker
                value={publishAt}
                onChange={setPublishAt}
                label="Schedule Publishing"
                helperText="Leave empty to publish immediately"
                helperTextActive="Event will auto-publish at this time"
              />
              {hasOrganiserProfile && (
                <DateTimePicker
                  value={ticketsAvailableUntil}
                  onChange={setTicketsAvailableUntil}
                  label="Ticket Sales End"
                  helperText="Leave empty to close at event start"
                />
              )}
              <Button
                type="button"
                className="w-full h-12 rounded-tile font-bold tracking-widest text-sm"
                disabled={createEventMutation.isPending}
                onClick={handleSubmit}
              >
                {createEventMutation.isPending ? "CREATING…" : publishAt ? "SCHEDULE EVENT" : "CREATE EVENT"}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="no-press fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border/50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${activeTab === "details" ? "text-primary" : "text-muted-foreground"}`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Details</span>
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
                activeTab === tab.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-bold tracking-widest uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Exit dialog */}
      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Save as draft?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You have unsaved changes. Would you like to save this event as a draft?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate(-1)} className="border-border">Discard</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveDraft}>Save Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreateEvent;
