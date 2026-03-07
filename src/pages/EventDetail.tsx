import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  X, Share2, Heart, MapPin, CheckCircle2, Users, Tag, Calendar, HelpCircle, CalendarPlus, Pencil
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PurchaseModal from "@/components/PurchaseModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent } from "@/hooks/useEventsQuery";
import { useProfile } from "@/hooks/useProfileQuery";
import { format, isPast } from "date-fns";
import { events as mockEvents, Event as MockEvent } from "@/data/events";
import { rsvpApi } from "@/api";
import { useQuery } from "@tanstack/react-query";
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
  
  const [isInterested, setIsInterested] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

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

  const loading = !isMock && isLoading;

  const handleShare = async () => {
    const title = foundMockEvent?.title || dbEvent?.title;
    if (navigator.share) {
      await navigator.share({ title, text: `Join me at ${title}!`, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!", description: "Event link has been copied to clipboard" });
    }
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

    try {
      await rsvpApi.join(id);
      toast({ title: "RSVP Submitted!", description: "You're going to this event!" });
    } catch {
      toast({ title: "RSVP Submitted!", description: "Waiting for host approval..." });
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
  const isHost = user && dbEvent && dbEvent.hostId === user.id;
  const isPastEvent = dbEvent ? isPast(new Date(dbEvent.eventDate)) : false;

  // Determine display host: organiser profile takes priority
  const displayHostName = organiserHost?.display_name || host?.displayName || "Event Host";
  const displayHostAvatar = organiserHost?.avatar_url || host?.avatarUrl || undefined;
  const displayHostLink = organiserHost
    ? `/organiser/${organiserHost.username}`
    : `/user/${dbEvent?.hostId || ""}`;

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
  const eventImage = foundMockEvent?.image || dbEvent?.coverImage;
  const eventDate = foundMockEvent ? foundMockEvent.date : format(new Date(dbEvent!.eventDate), "EEEE, MMM d");
  const eventTime = foundMockEvent ? "9:00 PM" : format(new Date(dbEvent!.eventDate), "h:mm a");
  const eventLocation = foundMockEvent?.location || dbEvent?.category || "";
  const eventAddress = foundMockEvent?.address || dbEvent?.location || "";
  const eventDescription = foundMockEvent?.description || dbEvent?.description || "";
  const attendees = foundMockEvent?.attendees || 0;
  const guests = foundMockEvent?.guests || [];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="relative">
        <div className="aspect-[4/5] w-full">
          {eventImage ? (
            <img src={eventImage} alt={eventTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
              <span className="text-6xl">🎉</span>
            </div>
          )}
        </div>
        <button onClick={() => navigate(-1)} className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <X className="h-5 w-5 text-foreground" />
        </button>
        {isHost && (
          <button onClick={() => navigate(`/events/${id}/edit`)} className="absolute top-4 left-4 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Pencil className="h-5 w-5 text-foreground" />
          </button>
        )}
        <button onClick={handleShare} className="absolute top-16 right-4 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Share2 className="h-5 w-5 text-foreground" />
        </button>
        <button onClick={handleInterested} className="absolute bottom-4 right-4 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Heart className={`h-6 w-6 ${isInterested ? "fill-primary text-primary" : "text-foreground"}`} />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-sans" style={{ textTransform: 'capitalize' }}>{eventTitle}</h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">{eventDate}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-foreground">{eventTime}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{eventAddress.split(',')[0] || eventLocation}</span>
              <CheckCircle2 className="h-4 w-4 text-primary fill-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{eventAddress.split(',').slice(1).join(',').trim() || "Venue address"}</p>
          </div>
        </div>

        {(foundMockEvent?.category || dbEvent?.category) && (
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-secondary rounded-full text-sm text-foreground">{foundMockEvent?.category || dbEvent?.category}</span>
            <span className="px-3 py-1 bg-secondary rounded-full text-sm text-foreground">21+</span>
          </div>
        )}

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
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">See who's going</span>
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

        <div>
          <h3 className="font-semibold text-foreground mb-2">About this event</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{eventDescription}</p>
        </div>

        <div className="bg-card rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-3">Venue</h3>
          <div className="aspect-video bg-secondary rounded-lg mb-3 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-2">Map Preview</span>
          </div>
          <p className="text-foreground font-medium">{eventAddress.split(',')[0] || eventLocation}</p>
          <p className="text-sm text-muted-foreground">{eventAddress || "Full address"}</p>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1 text-muted-foreground">
            <HelpCircle className="h-4 w-4 mr-2" />Need Help?
          </Button>
          <Button variant="ghost" className="flex-1 text-muted-foreground" disabled>
            <CalendarPlus className="h-4 w-4 mr-2" />Add to Calendar<span className="text-xs ml-1">(Soon)</span>
          </Button>
        </div>
      </div>

      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {isPastEvent ? (
            <div className="w-full text-center py-2">
              <p className="font-semibold text-muted-foreground">This event has ended</p>
            </div>
          ) : isFreeEvent ? (
            <>
              <div><p className="font-semibold text-foreground">Free Event</p><p className="text-sm text-muted-foreground">RSVP required</p></div>
              <Button size="lg" onClick={handleRSVP}>RSVP</Button>
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

      <BottomNav />
    </div>
  );
};

export default EventDetail;
