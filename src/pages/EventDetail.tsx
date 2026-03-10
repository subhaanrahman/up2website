import { useParams, Link, useNavigate } from "react-router-dom";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import { useState } from "react";
import { getOptimizedUrl } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  X, Share2, Send, Heart, MapPin, CheckCircle2, Users, Tag, Calendar, HelpCircle, CalendarPlus, Pencil, BadgeCheck, Minus, Plus
} from "lucide-react";
import { downloadIcsFile } from "@/lib/calendarUtils";
import { useFriendsGoing } from "@/hooks/useFriendsGoing";
import BottomNav from "@/components/BottomNav";
import PurchaseModal from "@/components/PurchaseModal";
import ShareEventSheet from "@/components/ShareEventSheet";
import EventBoard from "@/components/EventBoard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent } from "@/hooks/useEventsQuery";
import { useProfile } from "@/hooks/useProfileQuery";
import { useTicketTiers } from "@/hooks/useTicketTiers";
import { useOrderFlow } from "@/hooks/useOrderFlow";
import { format, isPast } from "date-fns";
import { events as mockEvents } from "@/data/events";
import { rsvpApi } from "@/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [guestCount, setGuestCount] = useState(1);

  const { reserving } = useOrderFlow();

  // Check mock first
  const foundMockEvent = id ? mockEvents.find(e => e.id === id) : undefined;
  const isMock = !!foundMockEvent;

  // Only fetch from DB if not a mock event (numeric IDs are mock)
  const isUuid = id && id.length > 5;
  const { data: dbEvent, isLoading } = useEvent(isUuid && !isMock ? id : undefined);

  // Fetch host profile for DB events
  const { data: host } = useProfile(dbEvent?.hostId);

  // Fetch real ticket tiers from DB
  const { data: ticketTiers = [] } = useTicketTiers(dbEvent?.id);

  // Determine if this is a paid event based on DB ticket tiers
  const hasPaidTiers = ticketTiers.length > 0 && ticketTiers.some(t => t.priceCents > 0);

  // Fetch organiser profile if event has one
  const { data: organiserHost } = useQuery({
    queryKey: ["organiser-profile", dbEvent?.id],
    queryFn: async () => {
      if (!dbEvent) return null;
      const { data } = await supabase
        .from("events")
        .select("organiser_profile_id")
        .eq("id", dbEvent.id)
        .single();
      if (!data?.organiser_profile_id) return null;
      const { data: org } = await supabase
        .from("organiser_profiles")
        .select("*")
        .eq("id", data.organiser_profile_id)
        .single();
      return org;
    },
    enabled: !!dbEvent,
  });

  // Fetch user's existing RSVP for this event
  const { data: userRsvp } = useQuery({
    queryKey: ["user-rsvp", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data } = await supabase
        .from("rsvps")
        .select("id, status")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user && !isMock,
  });

  // Fetch attendees
  const { data: attendeeProfiles } = useQuery({
    queryKey: ["event-attendees", id],
    queryFn: async () => {
      if (!id) return [];
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("user_id")
        .eq("event_id", id)
        .eq("status", "going")
        .limit(10);
      if (!rsvps || rsvps.length === 0) return [];
      const userIds = rsvps.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      return profiles || [];
    },
    enabled: !!id && !isMock,
  });

  // Fetch cohosts
  const { data: eventCohosts = [] } = useQuery({
    queryKey: ["event-cohosts", id],
    queryFn: async () => {
      if (!id) return [];
      const { data: rows } = await supabase
        .from("event_cohosts")
        .select("id, organiser_profile_id, user_id, role")
        .eq("event_id", id);
      if (!rows || rows.length === 0) return [];

      const results: { id: string; displayName: string; avatarUrl: string | null; link: string }[] = [];

      const orgIds = rows.filter(r => r.organiser_profile_id).map(r => r.organiser_profile_id!);
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organiser_profiles")
          .select("id, display_name, avatar_url")
          .in("id", orgIds);
        for (const o of orgs || []) {
          results.push({ id: o.id, displayName: o.display_name, avatarUrl: o.avatar_url, link: `/user/${o.id}` });
        }
      }

      const userIds = rows.filter(r => r.user_id).map(r => r.user_id!);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        for (const p of profiles || []) {
          results.push({ id: p.user_id, displayName: p.display_name || "User", avatarUrl: p.avatar_url, link: `/user/${p.user_id}` });
        }
      }

      return results;
    },
    enabled: !!id && !isMock,
  });

  // P-06: Friends going to this event
  const { data: friendsGoing = [] } = useFriendsGoing(isUuid && !isMock ? id : undefined);

  // Check if user has a valid ticket for this event
  const { data: hasTicket } = useQuery({
    queryKey: ["user-ticket", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return false;
      const { data } = await supabase
        .from("tickets")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .eq("status", "valid")
        .maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user && !isMock,
  });

  // P-10: Waitlist & capacity check
  const { data: capacityInfo } = useQuery({
    queryKey: ["event-capacity", id],
    queryFn: async () => {
      if (!id) return null;
      const { data: ev } = await supabase
        .from("events")
        .select("max_guests")
        .eq("id", id)
        .single();
      if (!ev?.max_guests) return { isFull: false, maxGuests: null };
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("guest_count")
        .eq("event_id", id)
        .eq("status", "going");
      const totalGuests = (rsvps || []).reduce((sum, r) => sum + ((r as any).guest_count || 1), 0);
      return { isFull: totalGuests >= ev.max_guests, maxGuests: ev.max_guests, currentCount: totalGuests };
    },
    enabled: !!id && !isMock,
  });

  // P-10: User's waitlist status
  const { data: waitlistStatus, refetch: refetchWaitlist } = useQuery({
    queryKey: ["waitlist-status", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data } = await supabase
        .from("waitlist")
        .select("id, position")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user && !isMock,
  });

  const loading = !isMock && isLoading;

  const handleShare = () => {
    setShowShareSheet(true);
  };

  // F-07: Saved events query
  const { data: savedStatus, refetch: refetchSaved } = useQuery({
    queryKey: ["saved-event", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data } = await supabase
        .from("saved_events")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user && !isMock,
  });

  const isInterested = !!savedStatus;

  const handleInterested = async () => {
    if (!user || !id) return;
    setSavingEvent(true);
    try {
      if (isInterested) {
        await supabase.from("saved_events").delete().eq("event_id", id).eq("user_id", user.id);
        toast({ title: "Removed from saved", description: "Event removed from your saved list" });
      } else {
        await supabase.from("saved_events").insert({ user_id: user.id, event_id: id });
        toast({ title: "Saved!", description: "Event added to your saved list" });
      }
      refetchSaved();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setSavingEvent(false);
    }
  };

  const handleCheckout = (tierId: string, quantity: number, discountCode?: string) => {
    if (!dbEvent) return;
    const tier = ticketTiers.find(t => t.id === tierId);
    if (!tier) return;

    setShowPurchaseModal(false);
    navigate("/checkout", {
      state: {
        eventId: dbEvent.id,
        eventTitle: dbEvent.title,
        eventDate: format(new Date(dbEvent.eventDate), "EEEE, MMM d • h:mm a"),
        eventLocation: dbEvent.location || "TBD",
        tierId: tier.id,
        tierName: tier.name,
        tierPriceCents: tier.priceCents,
        quantity,
        discountCode,
      },
    });
  };

  const handleRSVP = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!id) return;

    setRsvpLoading(true);
    try {
      await rsvpApi.join(id, 'going', guestCount);
      queryClient.invalidateQueries({ queryKey: ["user-rsvp", id, user.id] });
      queryClient.invalidateQueries({ queryKey: ["event-capacity", id] });
      toast({ title: "RSVP Submitted!", description: `You're going${guestCount > 1 ? ` +${guestCount - 1}` : ''}!` });
    } catch (err: any) {
      const msg = err?.message?.includes('capacity') ? 'Event is at capacity' : 'Something went wrong, please try again.';
      toast({ title: "RSVP Failed", description: msg, variant: "destructive" });
    } finally {
      setRsvpLoading(false);
    }
  };

  // P-05: Add to Calendar
  const handleAddToCalendar = () => {
    if (!dbEvent) return;
    downloadIcsFile({
      title: dbEvent.title,
      description: dbEvent.description,
      location: dbEvent.location,
      startDate: new Date(dbEvent.eventDate),
      endDate: dbEvent.endDate ? new Date(dbEvent.endDate) : null,
    });
    toast({ title: "Calendar file downloaded", description: "Import the .ics file into your calendar app" });
  };

  // P-10: Join waitlist
  const handleJoinWaitlist = async () => {
    if (!user || !id) return;
    setRsvpLoading(true);
    try {
      // Get current waitlist count for position
      const { count } = await supabase
        .from("waitlist")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id);
      await supabase.from("waitlist").insert({
        event_id: id,
        user_id: user.id,
        position: (count || 0) + 1,
      });
      refetchWaitlist();
      toast({ title: "Joined Waitlist", description: `You're #${(count || 0) + 1} on the waitlist` });
    } catch {
      toast({ title: "Failed", description: "Could not join waitlist", variant: "destructive" });
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!user || !id) return;
    setRsvpLoading(true);
    try {
      await supabase.from("waitlist").delete().eq("event_id", id).eq("user_id", user.id);
      refetchWaitlist();
      toast({ title: "Left Waitlist" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleLeaveRSVP = async () => {
    if (!user || !id) return;
    setRsvpLoading(true);
    try {
      await rsvpApi.leave(id);
      queryClient.invalidateQueries({ queryKey: ["user-rsvp", id, user.id] });
      toast({ title: "RSVP Cancelled", description: "You've been removed from the guest list." });
    } catch {
      toast({ title: "Error", description: "Could not cancel RSVP.", variant: "destructive" });
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="pt-12 container mx-auto px-4 text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const event = foundMockEvent || dbEvent;
  // Paid event = has ticket tiers with price > 0 (DB events only)
  const isFreeEvent = !isMock && !hasPaidTiers;
  const isHost = user && dbEvent && (
    dbEvent.hostId === user.id ||
    (organiserHost && organiserHost.owner_id === user.id)
  );
  const isPastEvent = dbEvent ? isPast(new Date(dbEvent.eventDate)) : false;

  const displayHostName = organiserHost?.display_name || host?.displayName || foundMockEvent?.host?.name || "Event Host";
  const displayHostAvatar = organiserHost?.avatar_url || host?.avatarUrl || foundMockEvent?.host?.avatar || undefined;
  const displayHostLink = organiserHost
    ? `/user/${organiserHost.id}`
    : dbEvent?.hostId
      ? `/user/${dbEvent.hostId}`
      : "#";

  if (!event) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="pt-12 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Event not found</h1>
          <Link to="/"><Button variant="outline">Back to Home</Button></Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const eventTitle = foundMockEvent?.title || dbEvent?.title || "";
  const eventImage = foundMockEvent?.image || dbEvent?.coverImage || (id ? getEventFlyer(id) : undefined);
  
  const startDate = dbEvent ? new Date(dbEvent.eventDate) : null;
  const endDateObj = dbEvent?.endDate ? new Date(dbEvent.endDate) : null;
  
  const formatEventDate = () => {
    if (foundMockEvent) return foundMockEvent.date;
    if (!startDate) return "";
    const startStr = format(startDate, "EEEE, MMM d");
    if (endDateObj && format(endDateObj, "yyyy-MM-dd") !== format(startDate, "yyyy-MM-dd")) {
      return `${startStr} – ${format(endDateObj, "EEEE, MMM d")}`;
    }
    return startStr;
  };
  
  const eventDate = formatEventDate();
  const eventTime = foundMockEvent ? "9:00 PM" : startDate
    ? (endDateObj
      ? `${format(startDate, "h:mm a")} – ${format(endDateObj, "h:mm a")}`
      : format(startDate, "h:mm a"))
    : "";
  const eventLocation = foundMockEvent?.location || dbEvent?.category || "";
  const eventAddress = foundMockEvent?.address || dbEvent?.location || "";
  const eventDescription = foundMockEvent?.description || dbEvent?.description || "";
  const attendees = foundMockEvent?.attendees || 0;
  const guests = foundMockEvent?.guests || [];

  // Lowest tier price for display
  const lowestPriceCents = hasPaidTiers
    ? Math.min(...ticketTiers.filter(t => t.priceCents > 0).map(t => t.priceCents))
    : 0;

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full flex items-center justify-center">
          <X className="h-5 w-5 text-foreground" />
        </button>
        <button onClick={handleShare} className="h-10 w-10 rounded-full flex items-center justify-center">
          <Send className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-3">
        <h1 className="text-2xl font-black text-foreground tracking-[0.05em] uppercase leading-tight text-center" style={{ fontFamily: "'Akira Expanded', sans-serif", fontStretch: 'expanded' }}>{eventTitle}</h1>
      </div>

      {/* Cover image */}
      <div className="px-4 pb-4">
        <div className="rounded-2xl overflow-hidden">
          {eventImage ? (
            <img src={getOptimizedUrl(eventImage, 'EVENT_HERO') || eventImage} alt={eventTitle} className="w-full aspect-[4/5] object-cover" />
          ) : (
            <div className="w-full aspect-[4/5] bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center rounded-2xl">
              <span className="text-6xl">🎉</span>
            </div>
          )}
        </div>
      </div>

      {/* Host manage/edit buttons */}
      {isHost && (
        <div className="px-4 pb-4 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => navigate(`/events/${id}/manage`)}>
            Manage
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => navigate(`/events/${id}/edit`)}>
            Edit
          </Button>
        </div>
      )}

      <div className="px-4 space-y-4">
        {/* Date & Venue row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-foreground text-lg">{eventDate}</p>
            <p className="text-foreground font-medium">{eventAddress.split(',')[0] || eventLocation}</p>
            <p className="text-sm text-muted-foreground">{eventAddress.split(',').slice(1).join(',').trim() || "Venue address"}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Link to={displayHostLink} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
              <span className="font-bold text-foreground text-lg">{displayHostName}</span>
              {(organiserHost || host?.isVerified) && (
                <BadgeCheck className="h-5 w-5 text-primary fill-primary stroke-primary-foreground" />
              )}
            </Link>
            <button className="h-10 w-10 rounded-full flex items-center justify-center">
              <MapPin className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-muted-foreground text-sm leading-relaxed">{eventDescription}</p>
        </div>

        {/* Hosted by */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Hosted by</p>
          <div className="space-y-2">
            <Link to={displayHostLink} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar className="h-10 w-10">
                <AvatarImage src={displayHostAvatar} />
                <AvatarFallback>{displayHostName[0]}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{displayHostName}</span>
            </Link>
            {eventCohosts.length > 0 && eventCohosts.map((cohost) => (
              <Link key={cohost.id} to={cohost.link} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={cohost.avatarUrl || undefined} />
                  <AvatarFallback>{cohost.displayName[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{cohost.displayName}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Guests / Attending */}
        {guests.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {guests.slice(0, 4).map((guest, index) => (
                <Avatar key={index} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={guest.avatar} />
                  <AvatarFallback>{guest.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              <Users className="h-4 w-4 inline mr-1" />{attendees} attending
            </span>
          </div>
        )}

        {dbEvent && (
          <Link to={`/events/${id}/guests`} className="flex items-center gap-2 py-2 text-primary hover:underline transition-colors">
            {attendeeProfiles && attendeeProfiles.length > 0 && (
              <div className="flex -space-x-2 mr-1">
                {attendeeProfiles.slice(0, 5).map((p) => (
                  <Avatar key={p.user_id} className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{(p.display_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">
              {attendeeProfiles && attendeeProfiles.length > 0
                ? `${attendeeProfiles.length}${attendeeProfiles.length >= 10 ? '+' : ''} going`
                : "See who's going"}
            </span>
          </Link>
        )}

        {/* P-06: Friends going highlight */}
        {friendsGoing.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex -space-x-2">
              {friendsGoing.slice(0, 4).map((f) => (
                <Avatar key={f.userId} className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={f.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">{(f.displayName || "?")[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {friendsGoing.length === 1
                ? `${friendsGoing[0].displayName || 'A friend'} is going`
                : `${friendsGoing.length} friends going`}
            </span>
          </div>
        )}

        {/* Event Board — visible to attendees, ticket holders, and host */}
        {dbEvent && user && (userRsvp || isHost || hasTicket) && (
          <EventBoard eventId={dbEvent.id} />
        )}

        {/* P-05: Add to Calendar */}
        {dbEvent && !isPastEvent && (
          <Button variant="secondary" className="w-full" onClick={handleAddToCalendar}>
            <CalendarPlus className="h-4 w-4 mr-2" />
            Add to Calendar
          </Button>
        )}

        {/* Venue / Map */}
        <div className="bg-card rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-3">Venue</h3>
          <div className="aspect-video rounded-lg mb-3 overflow-hidden">
            {eventAddress ? (
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(eventAddress)}&output=embed&z=15`}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Event location map"
              />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <MapPin className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground ml-2">No address provided</span>
              </div>
            )}
          </div>
          <p className="text-foreground font-medium">{eventAddress.split(',')[0] || eventLocation}</p>
          <p className="text-sm text-muted-foreground">{eventAddress || "Full address"}</p>
        </div>
      </div>

      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {isPastEvent ? (
            <div className="w-full text-center py-2">
              <p className="font-semibold text-muted-foreground">This event has ended</p>
            </div>
          ) : isHost ? (
            <>
              <div>
                <p className="font-semibold text-foreground">Your Event</p>
                <p className="text-sm text-muted-foreground">You're hosting this event</p>
              </div>
              <Button size="lg" onClick={() => navigate(`/events/${id}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" />Edit Event
              </Button>
            </>
          ) : userRsvp ? (
            <>
              <div>
                <p className="font-semibold text-foreground">You're {userRsvp.status === 'going' ? 'Going' : 'Interested'}! 🎉</p>
                <p className="text-sm text-muted-foreground">You're on the guest list</p>
              </div>
              <Button variant="secondary" size="lg" onClick={handleLeaveRSVP} disabled={rsvpLoading}>
                {rsvpLoading ? "..." : "Cancel RSVP"}
              </Button>
            </>
          ) : isMock ? (
            // Mock events — static display only
            <div className="w-full text-center py-2">
              <p className="font-semibold text-muted-foreground">Demo event</p>
            </div>
          ) : hasPaidTiers ? (
            <>
              <div>
                <p className="font-semibold text-foreground">From R{(lowestPriceCents / 100).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">+ fees</p>
              </div>
              <Button size="lg" onClick={() => { if (!user) navigate("/auth"); else setShowPurchaseModal(true); }}>
                Buy Tickets
              </Button>
            </>
          ) : capacityInfo?.isFull && !hasPaidTiers ? (
            // P-10: Waitlist when at capacity
            waitlistStatus ? (
              <>
                <div>
                  <p className="font-semibold text-foreground">On Waitlist #{waitlistStatus.position}</p>
                  <p className="text-sm text-muted-foreground">We'll notify you if a spot opens</p>
                </div>
                <Button variant="secondary" size="lg" onClick={handleLeaveWaitlist} disabled={rsvpLoading}>
                  {rsvpLoading ? "..." : "Leave Waitlist"}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <p className="font-semibold text-foreground">Event Full</p>
                  <p className="text-sm text-muted-foreground">Join the waitlist</p>
                </div>
                <Button size="lg" onClick={() => { if (!user) navigate("/auth"); else handleJoinWaitlist(); }} disabled={rsvpLoading}>
                  {rsvpLoading ? "..." : "Join Waitlist"}
                </Button>
              </>
            )
          ) : !hasPaidTiers ? (
            <>
              <div>
                <p className="font-semibold text-foreground">Free Event</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">Guests:</span>
                  <button
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center"
                    disabled={guestCount <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-medium text-foreground w-4 text-center">{guestCount}</span>
                  <button
                    onClick={() => setGuestCount(Math.min(5, guestCount + 1))}
                    className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center"
                    disabled={guestCount >= 5}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <Button size="lg" onClick={handleRSVP} disabled={rsvpLoading}>{rsvpLoading ? "Submitting..." : "RSVP"}</Button>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold text-foreground">From R{(lowestPriceCents / 100).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">+ fees</p>
              </div>
              <Button size="lg" onClick={() => { if (!user) navigate("/auth"); else setShowPurchaseModal(true); }}>
                Buy Tickets
              </Button>
            </>
          )}
        </div>
      </div>

      {dbEvent && (
        <PurchaseModal
          open={showPurchaseModal}
          onOpenChange={setShowPurchaseModal}
          eventTitle={eventTitle}
          eventDate={`${eventDate} • ${eventTime}`}
          eventLocation={eventAddress || eventLocation}
          eventId={dbEvent.id}
          ticketTiers={ticketTiers}
          loading={reserving}
          onCheckout={handleCheckout}
        />
      )}

      <ShareEventSheet
        open={showShareSheet}
        onOpenChange={setShowShareSheet}
        eventUrl={window.location.href}
        eventTitle={eventTitle}
        eventDate={`${eventDate} • ${eventTime}`}
        eventLocation={eventAddress || eventLocation}
        eventImage={eventImage}
        eventId={dbEvent?.id}
      />

      <BottomNav />
    </div>
  );
};

export default EventDetail;
