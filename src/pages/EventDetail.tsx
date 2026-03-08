import { useParams, Link, useNavigate } from "react-router-dom";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  X, Share2, Heart, MapPin, CheckCircle2, Users, Tag, Calendar, HelpCircle, CalendarPlus, Pencil, BadgeCheck
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PurchaseModal from "@/components/PurchaseModal";
import ShareEventSheet from "@/components/ShareEventSheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent } from "@/hooks/useEventsQuery";
import { useProfile } from "@/hooks/useProfileQuery";
import { format, isPast } from "date-fns";
import { events as mockEvents, Event as MockEvent } from "@/data/events";
import { rsvpApi } from "@/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const mockTicketTiers = [
  { id: "ga", name: "General Admission", price: 49.99, description: "Standard entry" },
  { id: "vip", name: "VIP Access", price: 99.99, description: "Priority entry + VIP area" },
  { id: "premium", name: "Premium Package", price: 149.99, description: "All VIP perks + drink tickets" },
];

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isInterested, setIsInterested] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Check mock first
  const foundMockEvent = id ? mockEvents.find(e => e.id === id) : undefined;
  const isMock = !!foundMockEvent;

  // Only fetch from DB if not a mock event (numeric IDs are mock)
  const isUuid = id && id.length > 5;
  const { data: dbEvent, isLoading } = useEvent(isUuid && !isMock ? id : undefined);

  // Fetch host profile for DB events
  const { data: host } = useProfile(dbEvent?.hostId);

  // Fetch organiser profile if event has one
  const { data: organiserHost } = useQuery({
    queryKey: ["organiser-profile", dbEvent?.id],
    queryFn: async () => {
      // Access the raw DB row to get organiser_profile_id
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

  // Fetch attendees (profiles of people who RSVP'd) for this event
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

  const loading = !isMock && isLoading;

  const handleShare = () => {
    setShowShareSheet(true);
  };

  const handleInterested = () => {
    setIsInterested(!isInterested);
    toast({
      title: isInterested ? "Removed from saved" : "Saved!",
      description: isInterested ? "Event removed from your saved list" : "Event added to your saved list",
    });
  };

  const handleCheckout = (tierId: string, quantity: number, discountCode?: string) => {
    const event = foundMockEvent || dbEvent;
    if (!event) return;
    const tier = mockTicketTiers.find(t => t.id === tierId);
    if (!tier) return;

    setShowPurchaseModal(false);
    navigate("/checkout", {
      state: {
        eventTitle: event.title,
        eventDate: foundMockEvent 
          ? foundMockEvent.date 
          : format(new Date(dbEvent!.eventDate), "EEEE, MMM d • h:mm a"),
        eventLocation: foundMockEvent?.location || dbEvent?.location || "TBD",
        tierName: tier.name,
        tierPrice: tier.price,
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
      await rsvpApi.join(id);
      queryClient.invalidateQueries({ queryKey: ["user-rsvp", id, user.id] });
      toast({ title: "RSVP Submitted!", description: "You're going to this event!" });
    } catch {
      toast({ title: "RSVP Failed", description: "Something went wrong, please try again.", variant: "destructive" });
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
  const isFreeEvent = !foundMockEvent;
  // Host = direct host_id match OR owner of the organiser profile
  const isHost = user && dbEvent && (
    dbEvent.hostId === user.id ||
    (organiserHost && organiserHost.owner_id === user.id)
  );
  const isPastEvent = dbEvent ? isPast(new Date(dbEvent.eventDate)) : false;

  // Determine display host: organiser profile takes priority, then DB host, then mock host
  const displayHostName = organiserHost?.display_name || host?.displayName || foundMockEvent?.host?.name || "Event Host";
  const displayHostAvatar = organiserHost?.avatar_url || host?.avatarUrl || foundMockEvent?.host?.avatar || undefined;
  const displayHostLink = organiserHost
    ? `/user/${organiserHost.owner_id}`
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
  
  // Format dates — use UTC-aware formatting to avoid timezone shift issues
  const startDate = dbEvent ? new Date(dbEvent.eventDate) : null;
  const endDateObj = dbEvent?.endDate ? new Date(dbEvent.endDate) : null;
  
  const formatEventDate = () => {
    if (foundMockEvent) return foundMockEvent.date;
    if (!startDate) return "";
    const startStr = format(startDate, "EEEE, MMM d");
    // Multi-day: show range
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

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full flex items-center justify-center">
          <X className="h-5 w-5 text-foreground" />
        </button>
        <button onClick={handleShare} className="h-10 w-10 rounded-full flex items-center justify-center">
          <Share2 className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Title */}
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-black text-foreground tracking-[0.05em] uppercase leading-tight text-center" style={{ fontFamily: "'Akira Expanded', sans-serif", fontStretch: 'expanded' }}>{eventTitle}</h1>
      </div>

      {/* Cover image */}
      <div className="px-4 pb-4">
        <div className="rounded-2xl overflow-hidden">
          {eventImage ? (
            <img src={eventImage} alt={eventTitle} className="w-full aspect-[4/5] object-cover" />
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
              <BadgeCheck className="h-5 w-5 text-primary fill-primary" />
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
          <Link to={displayHostLink} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-10 w-10">
              <AvatarImage src={displayHostAvatar} />
              <AvatarFallback>{displayHostName[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{displayHostName}</span>
          </Link>
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

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />Share / Invite
          </Button>
          <Button variant="secondary" className="flex-1">
            <Tag className="h-4 w-4 mr-2" />Add Code
          </Button>
        </div>

        {/* Venue / Map */}
        <div className="bg-card rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-3">Venue</h3>
          <div className="aspect-video bg-secondary rounded-lg mb-3 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-2">Map Preview</span>
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
          ) : isFreeEvent ? (
            <>
              <div><p className="font-semibold text-foreground">Free Event</p><p className="text-sm text-muted-foreground">RSVP required</p></div>
              <Button size="lg" onClick={handleRSVP} disabled={rsvpLoading}>{rsvpLoading ? "Submitting..." : "RSVP"}</Button>
            </>
          ) : (
            <>
              <div><p className="font-semibold text-foreground">From $49.99</p><p className="text-sm text-muted-foreground">+ fees</p></div>
              <Button size="lg" onClick={() => { if (!user) navigate("/auth"); else setShowPurchaseModal(true); }}>Buy Tickets</Button>
            </>
          )}
        </div>
      </div>

      <PurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        eventTitle={eventTitle}
        eventDate={`${eventDate} • ${eventTime}`}
        eventLocation={eventAddress || eventLocation}
        ticketTiers={mockTicketTiers}
        onCheckout={handleCheckout}
      />

      <ShareEventSheet
        open={showShareSheet}
        onOpenChange={setShowShareSheet}
        eventUrl={window.location.href}
        eventTitle={eventTitle}
        eventDate={`${eventDate} • ${eventTime}`}
        eventLocation={eventAddress || eventLocation}
        eventImage={eventImage}
      />

      <BottomNav />
    </div>
  );
};

export default EventDetail;
