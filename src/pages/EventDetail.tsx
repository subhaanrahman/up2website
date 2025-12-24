import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  X, 
  Share2, 
  Heart, 
  MapPin, 
  CheckCircle2, 
  Users, 
  Tag,
  Calendar,
  HelpCircle,
  CalendarPlus
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PurchaseModal from "@/components/PurchaseModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { events as mockEvents, Event as MockEvent } from "@/data/events";

interface DbEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  end_date: string | null;
  cover_image: string | null;
  category: string | null;
  max_guests: number | null;
  host_id: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

// Mock ticket tiers
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
  
  const [dbEvent, setDbEvent] = useState<DbEvent | null>(null);
  const [mockEvent, setMockEvent] = useState<MockEvent | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInterested, setIsInterested] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventData();
    }
  }, [id]);

  const fetchEventData = async () => {
    if (!id) return;

    try {
      // First check if it's a mock event (numeric ID)
      const foundMockEvent = mockEvents.find(e => e.id === id);
      if (foundMockEvent) {
        setMockEvent(foundMockEvent);
        setLoading(false);
        return;
      }

      // Otherwise fetch from database
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (eventError || !eventData) {
        setLoading(false);
        return;
      }

      setDbEvent(eventData);

      // Fetch host profile
      const { data: hostData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("user_id", eventData.host_id)
        .maybeSingle();

      setHost(hostData);
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const title = mockEvent?.title || dbEvent?.title;
    if (navigator.share) {
      await navigator.share({
        title: title,
        text: `Join me at ${title}!`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Event link has been copied to clipboard",
      });
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
    const event = mockEvent || dbEvent;
    if (!event) return;

    const tier = mockTicketTiers.find(t => t.id === tierId);
    if (!tier) return;

    setShowPurchaseModal(false);
    
    navigate("/checkout", {
      state: {
        eventTitle: event.title,
        eventDate: mockEvent 
          ? mockEvent.date 
          : format(new Date(dbEvent!.event_date), "EEEE, MMM d • h:mm a"),
        eventLocation: mockEvent?.location || dbEvent?.location || "TBD",
        tierName: tier.name,
        tierPrice: tier.price,
        quantity,
        discountCode,
      },
    });
  };

  const handleRSVP = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    toast({
      title: "RSVP Submitted!",
      description: "Waiting for host approval...",
    });
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

  const event = mockEvent || dbEvent;
  const isFreeEvent = !mockEvent; // For demo, mock events are paid, db events are free

  if (!event) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="pt-12 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Event not found</h1>
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const eventTitle = mockEvent?.title || dbEvent?.title || "";
  const eventImage = mockEvent?.image || dbEvent?.cover_image;
  const eventDate = mockEvent 
    ? mockEvent.date 
    : format(new Date(dbEvent!.event_date), "EEEE, MMM d");
  const eventTime = mockEvent 
    ? "9:00 PM" 
    : format(new Date(dbEvent!.event_date), "h:mm a");
  const eventLocation = mockEvent?.location || dbEvent?.category || "";
  const eventAddress = mockEvent?.address || dbEvent?.location || "";
  const eventDescription = mockEvent?.description || dbEvent?.description || "";
  const attendees = mockEvent?.attendees || 0;
  const guests = mockEvent?.guests || [];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Top Banner */}
      <div className="relative">
        {/* Event Image */}
        <div className="aspect-[4/5] w-full">
          {eventImage ? (
            <img
              src={eventImage}
              alt={eventTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
              <span className="text-6xl">🎉</span>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="absolute top-16 right-4 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <Share2 className="h-5 w-5 text-foreground" />
        </button>

        {/* Interested Button */}
        <button
          onClick={handleInterested}
          className="absolute bottom-4 right-4 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <Heart 
            className={`h-6 w-6 ${isInterested ? "fill-primary text-primary" : "text-foreground"}`} 
          />
        </button>
      </div>

      {/* Event Details */}
      <div className="px-4 pt-4 space-y-4">
        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">
          {eventTitle}
        </h1>

        {/* Date & Time */}
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">{eventDate}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-foreground">{eventTime}</span>
        </div>

        {/* Venue */}
        <div className="flex items-start gap-2">
          <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground">
                {eventAddress.split(',')[0] || eventLocation}
              </span>
              <CheckCircle2 className="h-4 w-4 text-primary fill-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {eventAddress.split(',').slice(1).join(',').trim() || "Venue address"}
            </p>
          </div>
        </div>

        {/* Tags */}
        {(mockEvent?.category || dbEvent?.category) && (
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-secondary rounded-full text-sm text-foreground">
              {mockEvent?.category || dbEvent?.category}
            </span>
            <span className="px-3 py-1 bg-secondary rounded-full text-sm text-foreground">
              21+
            </span>
          </div>
        )}

        {/* Hosts & Collaborators */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Hosted by</p>
          <div className="flex items-center gap-2">
            {host ? (
              <>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={host.avatar_url || undefined} />
                  <AvatarFallback>{host.display_name?.[0] || "H"}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{host.display_name || "Host"}</span>
              </>
            ) : (
              <>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>H</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">Event Host</span>
              </>
            )}
          </div>
        </div>

        {/* Friends Attending */}
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
              <Users className="h-4 w-4 inline mr-1" />
              {attendees} attending
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share / Invite
          </Button>
          <Button variant="secondary" className="flex-1">
            <Tag className="h-4 w-4 mr-2" />
            Add Code
          </Button>
        </div>

        {/* Description */}
        <div>
          <h3 className="font-semibold text-foreground mb-2">About this event</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {eventDescription}
          </p>
        </div>

        {/* Venue Info with Map Preview */}
        <div className="bg-card rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-3">Venue</h3>
          <div className="aspect-video bg-secondary rounded-lg mb-3 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-2">Map Preview</span>
          </div>
          <p className="text-foreground font-medium">
            {eventAddress.split(',')[0] || eventLocation}
          </p>
          <p className="text-sm text-muted-foreground">
            {eventAddress || "Full address"}
          </p>
        </div>

        {/* Bottom Utilities */}
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1 text-muted-foreground">
            <HelpCircle className="h-4 w-4 mr-2" />
            Need Help?
          </Button>
          <Button variant="ghost" className="flex-1 text-muted-foreground" disabled>
            <CalendarPlus className="h-4 w-4 mr-2" />
            Add to Calendar
            <span className="text-xs ml-1">(Soon)</span>
          </Button>
        </div>
      </div>

      {/* Sticky Purchase Banner */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {isFreeEvent ? (
            <>
              <div>
                <p className="font-semibold text-foreground">Free Event</p>
                <p className="text-sm text-muted-foreground">RSVP required</p>
              </div>
              <Button size="lg" onClick={handleRSVP}>
                RSVP
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold text-foreground">From $49.99</p>
                <p className="text-sm text-muted-foreground">+ fees</p>
              </div>
              <Button 
                size="lg" 
                onClick={() => {
                  if (!user) {
                    navigate("/auth");
                  } else {
                    setShowPurchaseModal(true);
                  }
                }}
              >
                Buy Tickets
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
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
