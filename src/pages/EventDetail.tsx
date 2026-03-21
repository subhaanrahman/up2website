import { useParams, Link, useNavigate } from "react-router-dom";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import { useState } from "react";
import { getOptimizedUrl } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  X, Send, MapPin, Users, CalendarPlus, BadgeCheck, Minus, Plus, ShieldCheck
} from "lucide-react";
import { downloadIcsFile } from "@/lib/calendarUtils";
import { useFriendsGoing } from "@/hooks/useFriendsGoing";
import BottomNav from "@/components/BottomNav";
import PurchaseModal from "@/components/PurchaseModal";
import ShareEventSheet from "@/components/ShareEventSheet";
import EventBoard from "@/components/EventBoard";
import RsvpConfirmationSheet from "@/components/RsvpConfirmationSheet";
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
import { ToastAction } from "@/components/ui/toast";
import { eventsRepository } from "@/features/events/repositories/eventsRepository";
import { eventManagementRepository } from "@/features/events/repositories/eventManagementRepository";
import { connectionsRepository } from "@/features/social/repositories/connectionsRepository";
import { profilesRepository } from "@/features/social/repositories/profilesRepository";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { trackInteraction } from "@/lib/interactionAnalytics";

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showRsvpConfirmation, setShowRsvpConfirmation] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);

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
      return eventManagementRepository.getEventOrganiserProfile(dbEvent.id);
    },
    enabled: !!dbEvent,
  });

  // Fetch organiser owner profile (so they appear in "Hosted by" when event is organiser-created)
  const { data: organiserOwnerProfile } = useProfile(organiserHost?.owner_id ?? undefined);

  // Fetch user's existing RSVP for this event
  const { data: userRsvp } = useQuery({
    queryKey: ["user-rsvp", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      return eventsRepository.getUserRsvpStatus(id, user.id);
    },
    enabled: !!id && !!user && !isMock,
  });

  // Fetch attendees
  const { data: attendeeProfiles } = useQuery({
    queryKey: ["event-attendees", id],
    queryFn: async () => {
      if (!id) return [];
      const userIds = await eventsRepository.getGoingUserIds(id, 10);
      if (userIds.length === 0) return [];
      return profilesRepository.getProfileDisplayInfo(userIds);
    },
    enabled: !!id && !isMock,
  });

  // Fetch cohosts
  const { data: eventCohosts = [] } = useQuery({
    queryKey: ["event-cohosts", id],
    queryFn: async () => {
      if (!id) return [];
      const rows = await eventManagementRepository.getCohosts(id);
      if (rows.length === 0) return [];

      const results: { id: string; displayName: string; avatarUrl: string | null; link: string }[] = [];

      const orgIds = rows.filter(r => r.organiser_profile_id).map(r => r.organiser_profile_id!);
      if (orgIds.length > 0) {
        const orgs = await profilesRepository.getOrganisersByIds(orgIds);
        for (const o of orgs) {
          results.push({ id: o.id, displayName: o.display_name, avatarUrl: o.avatar_url, link: `/user/${o.id}` });
        }
      }

      const userIds = rows.filter(r => r.user_id).map(r => r.user_id!);
      if (userIds.length > 0) {
        const profiles = await profilesRepository.getProfileDisplayInfo(userIds);
        for (const p of profiles) {
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
      return eventManagementRepository.hasValidTicket(id, user.id);
    },
    enabled: !!id && !!user && !isMock,
  });

  // P-10: Waitlist & capacity check
  const { data: capacityInfo } = useQuery({
    queryKey: ["event-capacity", id],
    queryFn: async () => {
      if (!id) return null;
      const info = await eventManagementRepository.getCapacityInfo(id);
      return { ...info, maxGuests: info.maxGuests ?? null };
    },
    enabled: !!id && !isMock,
  });

  // P-10: User's waitlist status
  const { data: waitlistStatus, refetch: refetchWaitlist } = useQuery({
    queryKey: ["waitlist-status", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      return eventManagementRepository.getWaitlistEntry(id, user.id);
    },
    enabled: !!id && !!user && !isMock,
  });

  const { data: hostEventCount = 0 } = useQuery({
    queryKey: ["host-event-count", dbEvent?.hostId],
    queryFn: async () => {
      if (!dbEvent?.hostId) return 0;
      const items = await eventsRepository.getByHost(dbEvent.hostId);
      return items.length;
    },
    enabled: !!dbEvent?.hostId,
  });

  const { data: inviteFriends = [] } = useQuery({
    queryKey: ["event-invite-friends", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const ids = [...(await connectionsRepository.getFriendIds(user.id))];
      if (ids.length === 0) return [];
      const profiles = await profilesRepository.getProfileDisplayInfo(ids.slice(0, 30));
      return profiles.map((p) => ({
        id: p.user_id,
        displayName: p.display_name || "Friend",
        avatarUrl: p.avatar_url,
      }));
    },
    enabled: !!user,
  });

  const loading = !isMock && isLoading;

  const handleShare = () => {
    setShowShareSheet(true);
    if (id) trackInteraction({ action: "event_share_open", eventId: id, source: "event_detail" });
  };

  // F-07: Saved events query
  const { data: savedStatus, refetch: refetchSaved } = useQuery({
    queryKey: ["saved-event", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      return eventsRepository.isEventSaved(id, user.id);
    },
    enabled: !!id && !!user && !isMock,
  });

  const isInterested = !!savedStatus;

  const handleInterested = async () => {
    if (!user || !id) return;
    const wasInterested = isInterested;
    setSavingEvent(true);
    try {
      queryClient.setQueryData(["saved-event", id, user.id], wasInterested ? null : { id: "optimistic" });

      if (wasInterested) {
        await eventsRepository.unsaveEvent(user.id, id);
        trackInteraction({ action: "unsave_event", eventId: id, source: "event_detail" });
        toast({ title: "Removed from saved", description: "Event removed from your saved list" });
      } else {
        await eventsRepository.saveEvent(user.id, id);
        trackInteraction({ action: "save_event", eventId: id, source: "event_detail" });
        toast({
          title: "Saved!",
          description: "Event added to your saved list",
          action: (
            <ToastAction
              altText="Undo"
              onClick={async () => {
                await eventsRepository.unsaveEvent(user.id, id);
                queryClient.invalidateQueries({ queryKey: ["saved-event", id, user.id] });
              }}
            >
              Undo
            </ToastAction>
          ),
        });
      }
      refetchSaved();
    } catch {
      queryClient.setQueryData(["saved-event", id, user.id], wasInterested ? { id: "rollback" } : null);
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
        eventLocation: dbEvent.venueName || dbEvent.location || dbEvent.address || "TBD",
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
      trackInteraction({ action: "rsvp_join", eventId: id, source: "event_detail" });
      setShowRsvpConfirmation(true);
      toast({
        title: "RSVP Submitted!",
        description: `You're going${guestCount > 1 ? ` +${guestCount - 1}` : ""}!`,
        action: (
          <ToastAction
            altText="Undo"
            onClick={async () => {
              await rsvpApi.leave(id);
              queryClient.invalidateQueries({ queryKey: ["user-rsvp", id, user.id] });
              queryClient.invalidateQueries({ queryKey: ["event-capacity", id] });
            }}
          >
            Undo
          </ToastAction>
        ),
      });
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
      location: dbEvent.address || dbEvent.location,
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
      const position = await eventManagementRepository.joinWaitlist(id, user.id);
      refetchWaitlist();
      toast({ title: "Joined Waitlist", description: `You're #${position} on the waitlist` });
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
      await eventManagementRepository.leaveWaitlist(id, user.id);
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

  // Include organiser owner in "Hosted by" when event is organiser-created (they have edit rights but may not be in event_cohosts)
  const organiserOwnerAsHost =
    organiserHost && organiserOwnerProfile
      ? {
          id: organiserHost.owner_id,
          displayName: organiserOwnerProfile.displayName || "User",
          avatarUrl: organiserOwnerProfile.avatarUrl ?? null,
          link: `/user/${organiserHost.owner_id}`,
        }
      : null;
  const ownerAlreadyInCohosts = organiserOwnerAsHost && eventCohosts.some((c) => c.id === organiserOwnerAsHost.id);
  const hostedByList = [
    ...(organiserOwnerAsHost && !ownerAlreadyInCohosts ? [organiserOwnerAsHost] : []),
    ...eventCohosts,
  ];

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
  
  const formatEventDate = () => {
    if (foundMockEvent) return foundMockEvent.date;
    if (!startDate) return "";
    return format(startDate, "EEEE, MMM d");
  };
  
  const eventDate = formatEventDate();
  const eventTime = foundMockEvent ? "9:00 PM" : startDate ? format(startDate, "h:mm a") : "";
  const eventVenueName = foundMockEvent?.location || dbEvent?.venueName || dbEvent?.location || "";
  const eventAddress = foundMockEvent?.address || dbEvent?.address || dbEvent?.location || "";
  const eventDescription = foundMockEvent?.description || dbEvent?.description || "";
  const attendees = foundMockEvent?.attendees || 0;
  const guests = foundMockEvent?.guests || [];

  // Lowest tier price for display
  const lowestPriceCents = hasPaidTiers
    ? Math.min(...ticketTiers.filter(t => t.priceCents > 0).map(t => t.priceCents))
    : 0;

  const inviteShareText = `Join me at ${eventTitle} on ${eventDate}`;

  const handleShareInviteLink = async () => {
    const eventUrl = `${window.location.origin}/events/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: eventTitle, text: inviteShareText, url: eventUrl });
      } else {
        await navigator.clipboard.writeText(eventUrl);
        toast({ title: "Event link copied" });
      }
      if (id) trackInteraction({ action: "invite_share", eventId: id, source: "event_detail" });
    } catch {
      // dismissed by user
    }
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!id || !user) return;
    setInvitingFriendId(friendId);
    try {
      await callEdgeFunction("notifications-send", {
        body: {
          type: "upcoming_event",
          recipient_user_id: friendId,
          title: `${displayHostName} invited you`,
          message: `${eventTitle} • ${eventDate}`,
          link: `/events/${id}`,
          event_image: eventImage || null,
          organiser_profile_id: organiserHost?.id ?? null,
        },
      });
      toast({ title: "Invite sent" });
      trackInteraction({ action: "invite_friend", eventId: id, source: "event_detail" });
    } catch {
      toast({ title: "Invite failed", variant: "destructive" });
    } finally {
      setInvitingFriendId(null);
    }
  };

  const ctaState = (() => {
    if (isPastEvent) {
      return {
        label: "Ended",
        sublabel: "This event has ended",
        primaryLabel: "Event Ended",
        onPrimary: () => undefined,
        primaryDisabled: true,
        primaryVariant: "secondary" as const,
      };
    }
    if (isHost) {
      return {
        label: "Host",
        sublabel: "You're hosting this event",
        primaryLabel: "Manage",
        onPrimary: () => navigate(`/events/${id}/manage`),
        secondaryLabel: "Edit",
        onSecondary: () => navigate(`/events/${id}/edit`),
      };
    }
    if (userRsvp) {
      return {
        label: "Going",
        sublabel: "You're on the guest list",
        primaryLabel: "Going",
        onPrimary: () => undefined,
        primaryDisabled: true,
        primaryVariant: "secondary" as const,
        secondaryLabel: "Cancel RSVP",
        onSecondary: handleLeaveRSVP,
      };
    }
    if (isMock) {
      return {
        label: "Demo",
        sublabel: "Static preview event",
        primaryLabel: "Demo Event",
        onPrimary: () => undefined,
        primaryDisabled: true,
        primaryVariant: "secondary" as const,
      };
    }
    if (hasPaidTiers) {
      return {
        label: "Buy",
        sublabel: `From R${(lowestPriceCents / 100).toFixed(2)}`,
        primaryLabel: "Buy Tickets",
        onPrimary: () => { if (!user) navigate("/auth"); else setShowPurchaseModal(true); },
      };
    }
    if (capacityInfo?.isFull) {
      if (waitlistStatus) {
        return {
          label: "Waitlist",
          sublabel: `You're #${waitlistStatus.position}`,
          primaryLabel: "Leave Waitlist",
          onPrimary: handleLeaveWaitlist,
          primaryVariant: "secondary" as const,
        };
      }
      return {
        label: "Waitlist",
        sublabel: "Event is full",
        primaryLabel: "Join Waitlist",
        onPrimary: () => { if (!user) navigate("/auth"); else handleJoinWaitlist(); },
      };
    }
    return {
      label: "Free",
      sublabel: "RSVP in one tap",
      primaryLabel: "RSVP",
      onPrimary: handleRSVP,
    };
  })();

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full flex items-center justify-center">
          <X className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleInterested}
            disabled={savingEvent}
            className="h-10 px-3 rounded-full bg-secondary text-xs font-semibold"
          >
            {isInterested ? "Saved" : "Save"}
          </button>
          <button onClick={() => setShowRsvpConfirmation(true)} className="h-10 px-3 rounded-full bg-secondary text-xs font-semibold">
            Invite
          </button>
          <button onClick={handleShare} className="h-10 w-10 rounded-full flex items-center justify-center">
            <Send className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-3">
        <h1 className="text-2xl font-black text-foreground tracking-[0.05em] uppercase leading-tight text-center" style={{ fontFamily: "'Akira Expanded', sans-serif", fontStretch: 'expanded' }}>{eventTitle}</h1>
      </div>

      {/* Cover image */}
      <div className="px-4 pb-4">
        <div className="rounded-tile overflow-hidden">
          {eventImage ? (
            <img
              src={getOptimizedUrl(eventImage, { width: 900, quality: 82 }) || eventImage}
              srcSet={[
                getOptimizedUrl(eventImage, { width: 420, quality: 68 }),
                getOptimizedUrl(eventImage, { width: 900, quality: 82 }),
                getOptimizedUrl(eventImage, { width: 1280, quality: 86 }),
              ]
                .filter(Boolean)
                .map((url, idx) => `${url} ${[420, 900, 1280][idx]}w`)
                .join(", ")}
              sizes="(max-width: 768px) 100vw, 680px"
              alt={eventTitle}
              className="w-full aspect-[4/5] object-cover bg-secondary/50"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="w-full aspect-[4/5] bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center rounded-tile">
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
        {/* Organiser, Date & Venue */}
        <div>
          <Link to={displayHostLink} className="inline-flex items-start gap-1.5 hover:opacity-80 transition-opacity">
            <span className="text-lg font-black tracking-[0.05em] text-foreground uppercase font-display leading-tight break-words" style={{ fontStretch: "expanded" }} title={displayHostName}>
              {displayHostName}
            </span>
            {(organiserHost || host?.isVerified) && (
              <BadgeCheck className="h-4 w-4 text-primary fill-primary [&>path:last-child]:text-primary-foreground shrink-0 mt-0.5" />
            )}
          </Link>
          <p className="text-foreground font-medium mt-1">{eventDate}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{eventVenueName || "Venue"}</p>
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
            {hostedByList.map((cohost) => (
              <Link key={cohost.id} to={cohost.link} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={cohost.avatarUrl || undefined} />
                  <AvatarFallback>{(cohost.displayName || "?")[0]}</AvatarFallback>
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

        {/* Guest confidence + host credibility */}
        {!userRsvp && (
          <div className="surface-card p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Guest Context</p>
            {friendsGoing.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {friendsGoing.slice(0, 4).map((f) => (
                    <Avatar key={f.userId} className="h-7 w-7 border-2 border-background">
                      <AvatarImage src={f.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">{(f.displayName || "?")[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-foreground">
                  {friendsGoing.length === 1
                    ? `${friendsGoing[0].displayName || "A friend"} is going`
                    : `${friendsGoing.length} friends are going`}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No friend overlap yet. Share this event with your crew.</p>
            )}
            <Link to={`/events/${id}/guests`} className="text-xs text-primary hover:underline">
              View guest list
            </Link>
          </div>
        )}

        <div className="surface-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Host Credibility</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">Friends Going</p>
              <p className="text-sm font-semibold text-foreground">{friendsGoing.length}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Past Events</p>
              <p className="text-sm font-semibold text-foreground">{hostEventCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Guestlist</p>
              <p className="text-sm font-semibold text-foreground">{capacityInfo?.currentCount ?? attendeeProfiles?.length ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Event Board — visible to attendees, ticket holders, and host */}
        {dbEvent && user && (userRsvp || isHost || hasTicket) && (
          <EventBoard
            eventId={dbEvent.id}
            canBroadcast={!!isHost}
            organiserProfileId={organiserHost?.id ?? null}
          />
        )}

        {/* P-05: Add to Calendar */}
        {dbEvent && !isPastEvent && (
          <Button variant="secondary" className="w-full" onClick={handleAddToCalendar}>
            <CalendarPlus className="h-4 w-4 mr-2" />
            Add to Calendar
          </Button>
        )}

        {/* Venue / Map */}
        <div className="bg-card rounded-tile-sm p-4">
          <h3 className="font-semibold text-foreground mb-3">Venue</h3>
          <div className="aspect-video rounded-lg mb-3 overflow-hidden">
            {eventAddress ? (
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(eventAddress)}&output=embed&z=15`}
                className="w-full h-full border-0 dark:[filter:grayscale(100%)_invert(98%)_contrast(95%)]"
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
          <p className="text-foreground font-medium">{eventAddress ? eventAddress.split(',')[0] : eventVenueName || "Address"}</p>
          <p className="text-sm text-muted-foreground">{eventAddress || "Full address"}</p>
        </div>
      </div>

      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{ctaState.label}</p>
              <p className="text-sm text-foreground font-medium">{ctaState.sublabel}</p>
              {ctaState.label === "Free" && !userRsvp && !isPastEvent && !capacityInfo?.isFull && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground">Guests</span>
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
              )}
            </div>
            <div className="flex items-center gap-2">
              {ctaState.secondaryLabel && ctaState.onSecondary && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={ctaState.onSecondary}
                  disabled={rsvpLoading}
                >
                  {ctaState.secondaryLabel}
                </Button>
              )}
              <Button
                variant={ctaState.primaryVariant ?? "default"}
                size="lg"
                onClick={ctaState.onPrimary}
                disabled={ctaState.primaryDisabled || rsvpLoading}
              >
                {rsvpLoading ? "..." : ctaState.primaryLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {dbEvent && (
        <PurchaseModal
          open={showPurchaseModal}
          onOpenChange={setShowPurchaseModal}
          eventTitle={eventTitle}
          eventDate={`${eventDate} • ${eventTime}`}
          eventLocation={eventAddress || eventVenueName}
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
        eventLocation={eventAddress || eventVenueName}
        eventImage={eventImage}
        eventId={dbEvent?.id}
      />

      <RsvpConfirmationSheet
        open={showRsvpConfirmation}
        onOpenChange={setShowRsvpConfirmation}
        eventTitle={eventTitle}
        onAddToCalendar={handleAddToCalendar}
        onInviteFriends={() => trackInteraction({ action: "invite_open", eventId: id || "", source: "rsvp_confirmation" })}
        onMessageHost={() => navigate(displayHostLink)}
        inviteFriends={inviteFriends}
        onInviteFriend={handleInviteFriend}
        invitingFriendId={invitingFriendId}
        onShareLink={handleShareInviteLink}
      />

      <BottomNav />
    </div>
  );
};

export default EventDetail;
