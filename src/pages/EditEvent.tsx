import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { eventManagementRepository } from "@/features/events/repositories/eventManagementRepository";
import { profilesRepository } from "@/features/social/repositories/profilesRepository";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, MapPin, Clock, X, Trash2, FileText, Ticket } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/useEventsQuery";
import { format } from "date-fns";
import EventDetailsForm, { type CohostEntry } from "@/components/create-event/EventDetailsForm";
import TicketingPanel from "@/components/create-event/TicketingPanel";
import type { TicketTier } from "@/components/create-event/TicketTierModal";
import type { DiscountCode } from "@/components/create-event/DiscountCodeModal";
import type { VipTableTier } from "@/components/create-event/VipTableTierModal";
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import { useStripeConnectOnboard } from "@/hooks/useStripeConnectOnboard";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { DateTimePicker } from "@/components/create-event/DateTimePicker";
import { supabase } from "@/infrastructure/supabase";
import { AppError } from "@/infrastructure/errors";

type EditTab = "details" | "ticketing";

function parseRefundDeadlineHoursInput(s: string): number | null | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0 || n > 168) return undefined;
  return n;
}

const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const { activeProfile, isOrganiser } = useActiveProfile();
  const [activeTab, setActiveTab] = useState<EditTab>("details");

  // Details form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");
  const [formErrors, setFormErrors] = useState<{ title?: string; date?: string; venueName?: string; address?: string }>({});
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [publishAt, setPublishAt] = useState("");

  // Co-host state
  const [cohosts, setCohosts] = useState<CohostEntry[]>([]);
  const [cohostInput, setCohostInput] = useState("");
  const [originalCohostIds, setOriginalCohostIds] = useState<string[]>([]);

  // Ticketing state
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

  const activeOrgId = isOrganiser ? activeProfile?.id : undefined;
  const { data: connectStatus } = useStripeConnectStatus(activeOrgId);
  const payoutsReady = connectStatus?.charges_enabled ?? false;
  const { startOnboarding: onStartOnboarding } = useStripeConnectOnboard(activeOrgId);

  // Populate form when event loads
  useEffect(() => {
    if (event) {
      const d = new Date(event.eventDate);
      setTitle(event.title);
      setDescription(event.description || "");
      setDate(format(d, "yyyy-MM-dd"));
      setTime(format(d, "HH:mm"));
      setVenueName(event.venueName || event.location || "");
      setAddress(event.address || "");
      setCapacity(event.maxGuests?.toString() || "");
      setCoverImage(event.coverImage || null);
      setPublishAt(event.publishAt || "");
      setTicketsAvailableFrom(event.ticketsAvailableFrom || "");
      setTicketsAvailableUntil(event.ticketsAvailableUntil || "");
      setVipTablesEnabled(event.vipTablesEnabled ?? false);
      setRefundsEnabled(event.refundsEnabled ?? false);
      setRefundPolicyText(event.refundPolicyText || "");
      const h = event.refundDeadlineHoursBeforeEvent;
      setRefundDeadlineHours(h != null && h > 0 ? String(h) : "");
    }
  }, [event]);

  // Load existing co-hosts + organiser owner (so list matches "Hosted by" on event page)
  const {
    data: loadedCohostEntries,
    isSuccess: cohostsQuerySuccess,
  } = useQuery({
    queryKey: ["event-cohosts-edit", id],
    queryFn: async (): Promise<CohostEntry[]> => {
      if (!id) return [];
      const entries: CohostEntry[] = [];

      // 1) Event's organiser profile and owner (so owner shows in form like on event page)
      const org = await eventManagementRepository.getEventOrganiserProfile(id);
      if (org?.owner_id) {
        const ownerProfile = await profilesRepository.getProfileByUserId(org.owner_id);
        if (ownerProfile) {
          entries.push({
            id: ownerProfile.user_id,
            type: "personal",
            displayName: ownerProfile.display_name || ownerProfile.username || "Unknown",
            username: ownerProfile.username ?? null,
            avatarUrl: ownerProfile.avatar_url ?? null,
          });
        }
      }

      // 2) Rows from event_cohosts (batch fetch like EventDetail)
      const rows = await eventManagementRepository.getCohosts(id);
      const orgIds = rows.filter((r) => r.organiser_profile_id).map((r) => r.organiser_profile_id!);
      const userIds = rows.filter((r) => r.user_id).map((r) => r.user_id!);
      const existingIds = new Set(entries.map((e) => e.id));

      if (orgIds.length > 0) {
        const orgs = await profilesRepository.getOrganisersByIds(orgIds);
        for (const o of orgs) {
          if (existingIds.has(o.id)) continue;
          existingIds.add(o.id);
          entries.push({
            id: o.id,
            type: "organiser",
            displayName: o.display_name || o.username || "Unknown",
            username: o.username ?? null,
            avatarUrl: o.avatar_url ?? null,
          });
        }
      }
      if (userIds.length > 0) {
        const profiles = await profilesRepository.getProfilesByIds(userIds);
        for (const p of profiles) {
          if (existingIds.has(p.user_id)) continue;
          existingIds.add(p.user_id);
          entries.push({
            id: p.user_id,
            type: "personal",
            displayName: p.display_name || p.username || "Unknown",
            username: p.username ?? null,
            avatarUrl: p.avatar_url ?? null,
          });
        }
      }
      return entries;
    },
    enabled: !!id,
  });

  // Sync loaded co-hosts into form state when query succeeds (runs for both [] and non-empty)
  useEffect(() => {
    if (!cohostsQuerySuccess || loadedCohostEntries === undefined) return;
    setCohosts([...loadedCohostEntries]);
    setOriginalCohostIds(loadedCohostEntries.map((e) => e.id));
  }, [cohostsQuerySuccess, loadedCohostEntries]);

  // Load existing ticket tiers
  const { data: existingTiers } = useQuery({
    queryKey: ["ticket-tiers-edit", id],
    queryFn: async () => {
      if (!id) return [];
      const data = await eventManagementRepository.getTicketTiers(id);
      return data.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price_cents / 100,
        availableQuantity: t.available_quantity,
      } as TicketTier));
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (existingTiers?.length) {
      setTicketTiers(existingTiers);
      setDiscountsEnabled(false);
    }
  }, [existingTiers]);

  const { data: existingVipTiers } = useQuery({
    queryKey: ["vip-table-tiers-edit", id],
    queryFn: async () => {
      if (!id) return [];
      const data = await eventManagementRepository.getVipTableTiers(id);
      return data.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        minSpend: t.min_spend_cents / 100,
        availableQuantity: t.available_quantity,
        maxGuests: t.max_guests,
        includedItems: t.included_items || [],
      } as VipTableTier));
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (existingVipTiers?.length) {
      setVipTableTiers(existingVipTiers);
    }
  }, [existingVipTiers]);

  // Authorization check
  const { data: isOrganiserOwner } = useQuery({
    queryKey: ["event-organiser-check", id, user?.id],
    queryFn: async () => {
      if (!event || !user) return false;
      return eventManagementRepository.isOrganiserOwner(event.id, user.id);
    },
    enabled: !!event && !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (event && user && event.hostId !== user.id && isOrganiserOwner === false) {
      toast({ title: "Not authorized", description: "You can only edit your own events", variant: "destructive" });
      navigate(`/events/${id}`);
    }
  }, [event, user, authLoading, isOrganiserOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !title || !date || !venueName || !address) {
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
      toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({
        title: "Session not ready",
        description: "No access token. Sign out and sign in again, or check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY match this project.",
        variant: "destructive",
      });
      return;
    }

    const eventDateTime = time ? `${date}T${time}:00` : `${date}T00:00:00`;

    try {
      await updateMutation.mutateAsync({
        id,
        title,
        description: description || undefined,
        venueName,
        address,
        eventDate: eventDateTime,
        maxGuests: capacity ? parseInt(capacity) : undefined,
        coverImage: coverImage || undefined,
        publishAt: publishAt ? new Date(publishAt).toISOString() : null,
        ticketsAvailableFrom: ticketsAvailableFrom ? new Date(ticketsAvailableFrom).toISOString() : null,
        ticketsAvailableUntil: ticketsAvailableUntil ? new Date(ticketsAvailableUntil).toISOString() : null,
        vipTablesEnabled,
        refundsEnabled,
        refundPolicyText: refundPolicyText.trim() || null,
        refundDeadlineHoursBeforeEvent: parseRefundDeadlineHoursInput(refundDeadlineHours) ?? null,
      });

      // Sync co-hosts: remove old, add new
      const newIds = cohosts.map((c) => c.id);
      const toRemove = originalCohostIds.filter((oid) => !newIds.includes(oid));
      const toAdd = cohosts.filter((c) => !originalCohostIds.includes(c.id));

      if (toRemove.length > 0) {
        await eventManagementRepository.removeCohosts(id, toRemove);
      }
      if (toAdd.length > 0) {
        await eventManagementRepository.insertCohosts(id, toAdd.map((c) => ({ id: c.id, type: c.type })));
      }

      // Sync ticket tiers: upsert all
      if (ticketTiers.length > 0) {
        await eventManagementRepository.upsertTicketTiers(
          id,
          ticketTiers.map((t) => ({
            id: t.id,
            name: t.name,
            priceCents: Math.round(t.price * 100),
            availableQuantity: t.availableQuantity,
          }))
        );
        const existingIds = existingTiers?.map((t) => t.id) || [];
        const currentIds = ticketTiers.map((t) => t.id);
        const toDeleteTiers = existingIds.filter((eid) => !currentIds.includes(eid));
        if (toDeleteTiers.length > 0) {
          await eventManagementRepository.deleteTicketTiers(toDeleteTiers);
        }
      }

      if (vipTablesEnabled && vipTableTiers.length > 0) {
        await eventManagementRepository.upsertVipTableTiers(
          id,
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
        const existingVipIds = existingVipTiers?.map((t) => t.id) || [];
        const currentVipIds = vipTableTiers.map((t) => t.id);
        const toDeleteVipTiers = existingVipIds.filter((eid) => !currentVipIds.includes(eid));
        if (toDeleteVipTiers.length > 0) {
          await eventManagementRepository.deleteVipTableTiers(toDeleteVipTiers);
        }
      }

      toast({ title: "Event updated!", description: "Your changes have been saved." });
      navigate(`/events/${id}`);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Failed to update event.";
      if (err instanceof AppError && err.statusCode === 401) {
        msg += " If you changed .env, sign out and sign in again.";
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Event deleted", description: "Your event has been removed." });
      navigate("/events");
    } catch {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase">Edit Event</h1>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="rounded-full px-5 text-xs font-bold tracking-widest"
          >
            {updateMutation.isPending ? "···" : "SAVE"}
          </Button>
        </div>
      </header>

      <main className="pt-4 md:pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-lg">

          {/* Tab content */}
          <form onSubmit={handleSubmit}>
            {activeTab === "details" && (
              <div className="space-y-4">
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
                <div className="space-y-3">
                  <DateTimePicker
                    value={publishAt}
                    onChange={setPublishAt}
                    label="Schedule Publishing"
                    helperText="Leave empty to publish immediately"
                    helperTextActive="Event will auto-publish at this time"
                  />
                  {isOrganiser && (
                    <DateTimePicker
                      value={ticketsAvailableUntil}
                      onChange={setTicketsAvailableUntil}
                      label="Ticket Sales End"
                      helperText="Leave empty to close at event start"
                    />
                  )}
                </div>
                {/* Capacity */}
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-foreground text-[10px] font-bold tracking-[0.2em] uppercase">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="h-12 bg-card border-border"
                    placeholder="Unlimited"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full h-12 rounded-tile font-bold tracking-widest text-sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="lg" className="w-full h-12 rounded-tile font-bold tracking-widest text-sm">
                      <Trash2 className="h-5 w-5 mr-2" /> Delete Event
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone. All RSVPs and event data will be permanently removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {activeTab === "ticketing" && (
              <div>
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
                  organiserProfileId={activeOrgId}
                  onStartOnboarding={onStartOnboarding}
                />
                <div className="mt-4">
                  <Button type="submit" size="lg" className="w-full h-12 rounded-tile font-bold tracking-widest text-sm" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="no-press fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border/50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${activeTab === "details" ? "text-primary" : "text-muted-foreground"}`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ticketing")}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${activeTab === "ticketing" ? "text-primary" : "text-muted-foreground"}`}
          >
            <Ticket className="h-5 w-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Ticketing</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default EditEvent;
