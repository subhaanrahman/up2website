import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

type EditTab = "details" | "ticketing";

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
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [formErrors, setFormErrors] = useState<{ title?: string; date?: string; location?: string }>({});

  // Co-host state
  const [cohosts, setCohosts] = useState<CohostEntry[]>([]);
  const [cohostInput, setCohostInput] = useState("");
  const [originalCohostIds, setOriginalCohostIds] = useState<string[]>([]);

  // Ticketing state
  const [showRemaining, setShowRemaining] = useState(false);
  const [discountsEnabled, setDiscountsEnabled] = useState(false);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [ticketsAvailableFrom, setTicketsAvailableFrom] = useState("");
  const [soldOutMessageEnabled, setSoldOutMessageEnabled] = useState(false);
  const [soldOutMessage, setSoldOutMessage] = useState("");

  const activeOrgId = isOrganiser ? activeProfile?.id : undefined;
  const { data: connectStatus } = useStripeConnectStatus(activeOrgId);
  const payoutsReady = connectStatus?.charges_enabled ?? false;

  // Populate form when event loads
  useEffect(() => {
    if (event) {
      const d = new Date(event.eventDate);
      setTitle(event.title);
      setDescription(event.description || "");
      setDate(format(d, "yyyy-MM-dd"));
      setTime(format(d, "HH:mm"));
      setLocation(event.location || "");
      setCapacity(event.maxGuests?.toString() || "");
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

      // 1) Event's organiser_profile_id and owner (so owner shows in form like on event page)
      const { data: eventRow } = await supabase
        .from("events")
        .select("organiser_profile_id")
        .eq("id", id)
        .single();
      const organiserProfileId = eventRow?.organiser_profile_id;
      if (organiserProfileId) {
        const { data: org } = await supabase
          .from("organiser_profiles")
          .select("owner_id")
          .eq("id", organiserProfileId)
          .single();
        if (org?.owner_id) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .eq("user_id", org.owner_id)
            .single();
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
      }

      // 2) Rows from event_cohosts (batch fetch like EventDetail)
      const { data: rows, error } = await supabase
        .from("event_cohosts")
        .select("id, organiser_profile_id, user_id, role")
        .eq("event_id", id);
      if (error) throw error;

      const orgIds = (rows || []).filter((r) => r.organiser_profile_id).map((r) => r.organiser_profile_id!);
      const userIds = (rows || []).filter((r) => r.user_id).map((r) => r.user_id!);
      const existingIds = new Set(entries.map((e) => e.id));

      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organiser_profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", orgIds);
        for (const o of orgs || []) {
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
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", userIds);
        for (const p of profiles || []) {
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
      const { data, error } = await supabase
        .from("ticket_tiers")
        .select("id, name, price_cents, available_quantity")
        .eq("event_id", id)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []).map((t) => ({
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

  // Authorization check
  const { data: isOrganiserOwner } = useQuery({
    queryKey: ["event-organiser-check", id, user?.id],
    queryFn: async () => {
      if (!event || !user) return false;
      const { data } = await supabase.from("events").select("organiser_profile_id").eq("id", event.id).single();
      if (!data?.organiser_profile_id) return false;
      const { data: org } = await supabase.from("organiser_profiles").select("owner_id").eq("id", data.organiser_profile_id).single();
      return org?.owner_id === user.id;
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
    if (!id || !title || !date || !location) {
      setFormErrors({
        title: !title ? "Event title is required" : undefined,
        date: !date ? "Date is required" : undefined,
        location: !location ? "Location is required" : undefined,
      });
      setActiveTab("details");
      return;
    }
    setFormErrors({});

    const eventDateTime = time ? `${date}T${time}:00` : `${date}T00:00:00`;

    try {
      await updateMutation.mutateAsync({
        id,
        title,
        description: description || undefined,
        location,
        eventDate: eventDateTime,
        maxGuests: capacity ? parseInt(capacity) : undefined,
      });

      // Sync co-hosts: remove old, add new
      const newIds = cohosts.map((c) => c.id);
      const toRemove = originalCohostIds.filter((oid) => !newIds.includes(oid));
      const toAdd = cohosts.filter((c) => !originalCohostIds.includes(c.id));

      if (toRemove.length > 0) {
        for (const rid of toRemove) {
          await supabase.from("event_cohosts").delete()
            .eq("event_id", id)
            .or(`organiser_profile_id.eq.${rid},user_id.eq.${rid}`);
        }
      }
      if (toAdd.length > 0) {
        await supabase.from("event_cohosts").insert(
          toAdd.map((c) => ({
            event_id: id,
            organiser_profile_id: c.type === "organiser" ? c.id : null,
            user_id: c.type === "personal" ? c.id : null,
            role: "cohost",
          }))
        );
      }

      // Sync ticket tiers: upsert all
      if (ticketTiers.length > 0) {
        await supabase.from("ticket_tiers").upsert(
          ticketTiers.map((t, idx) => ({
            id: t.id,
            event_id: id,
            name: t.name,
            price_cents: Math.round(t.price * 100),
            available_quantity: t.availableQuantity,
            position: idx,
          })),
          { onConflict: "id" }
        );
        // Remove tiers that were deleted
        const existingIds = existingTiers?.map((t) => t.id) || [];
        const currentIds = ticketTiers.map((t) => t.id);
        const toDeleteTiers = existingIds.filter((eid) => !currentIds.includes(eid));
        if (toDeleteTiers.length > 0) {
          await supabase.from("ticket_tiers").delete().in("id", toDeleteTiers);
        }
      }

      toast({ title: "Event updated!", description: "Your changes have been saved." });
      navigate(`/events/${id}`);
    } catch {
      toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
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
                  date={date} setDate={setDate}
                  time={time} setTime={setTime}
                  location={location} setLocation={setLocation}
                  description={description} setDescription={setDescription}
                  cohosts={cohosts} setCohosts={setCohosts}
                  cohostInput={cohostInput} setCohostInput={setCohostInput}
                  errors={formErrors}
                />
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
                <Button type="submit" size="lg" className="w-full h-12 rounded-2xl font-bold tracking-widest text-sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="lg" className="w-full h-12 rounded-2xl font-bold tracking-widest text-sm">
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
                  ticketsAvailableFrom={ticketsAvailableFrom} setTicketsAvailableFrom={setTicketsAvailableFrom}
                  soldOutMessageEnabled={soldOutMessageEnabled} setSoldOutMessageEnabled={setSoldOutMessageEnabled}
                  soldOutMessage={soldOutMessage} setSoldOutMessage={setSoldOutMessage}
                  payoutsReady={payoutsReady}
                />
                <div className="mt-4">
                  <Button type="submit" size="lg" className="w-full h-12 rounded-2xl font-bold tracking-widest text-sm" disabled={updateMutation.isPending}>
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
