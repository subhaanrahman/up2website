import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
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

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [dbEvent, setDbEvent] = useState<DbEvent | null>(null);
  const [mockEvent, setMockEvent] = useState<MockEvent | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Handle mock event display
  if (mockEvent) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </button>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              Share
            </Button>
          </div>
        </div>

        {/* Event Title */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight leading-tight">
            {mockEvent.title}
          </h1>
        </div>

        {/* Event Image */}
        <div className="px-4 py-4">
          <div className="rounded-2xl overflow-hidden">
            <img
              src={mockEvent.image}
              alt={mockEvent.title}
              className="w-full aspect-[4/5] object-cover"
            />
          </div>
        </div>

        {/* Event Info */}
        <div className="px-4 space-y-3">
          {/* Date and Venue Row */}
          <div className="flex items-start justify-between">
            <p className="text-lg font-semibold text-foreground">
              {mockEvent.date}
            </p>
            <div className="flex items-center gap-1 text-foreground">
              <span className="font-semibold">{mockEvent.location.split(',')[0]}</span>
              <CheckCircle2 className="h-4 w-4 text-primary fill-primary" />
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-foreground font-medium">{mockEvent.address.split(',')[0]}</p>
              <p className="text-muted-foreground text-sm">
                {mockEvent.address.split(',').slice(1).join(',').trim()}
              </p>
            </div>
            <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed pt-2">
            {mockEvent.description}
          </p>

          {/* Attendees Info */}
          <div className="pt-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              {mockEvent.guests.slice(0, 4).map((guest, index) => (
                <img
                  key={index}
                  src={guest.avatar}
                  alt={guest.name}
                  className="h-8 w-8 rounded-full border-2 border-background"
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {mockEvent.attendees} attending
            </span>
          </div>

          {/* RSVP Button */}
          <div className="pt-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                if (!user) {
                  navigate("/auth");
                } else {
                  toast({
                    title: "RSVP Submitted!",
                    description: `You're going to ${mockEvent.title}`,
                  });
                }
              }}
            >
              RSVP
            </Button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // Handle database event display
  if (dbEvent) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </button>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              Share
            </Button>
          </div>
        </div>

        {/* Event Title */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight leading-tight">
            {dbEvent.title}
          </h1>
        </div>

        {/* Event Image */}
        <div className="px-4 py-4">
          <div className="rounded-2xl overflow-hidden bg-muted">
            {dbEvent.cover_image ? (
              <img
                src={dbEvent.cover_image}
                alt={dbEvent.title}
                className="w-full aspect-[4/5] object-cover"
              />
            ) : (
              <div className="w-full aspect-[4/5] flex items-center justify-center">
                <span className="text-4xl">🎉</span>
              </div>
            )}
          </div>
        </div>

        {/* Event Info */}
        <div className="px-4 space-y-3">
          {/* Date and Category Row */}
          <div className="flex items-start justify-between">
            <p className="text-lg font-semibold text-foreground">
              {format(new Date(dbEvent.event_date), "EEEE, MMM d")}
            </p>
            {dbEvent.category && (
              <div className="flex items-center gap-1 text-foreground">
                <span className="font-semibold">{dbEvent.category}</span>
                <CheckCircle2 className="h-4 w-4 text-primary fill-primary" />
              </div>
            )}
          </div>

          {/* Location */}
          {dbEvent.location && (
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{dbEvent.location}</p>
              </div>
              <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          )}

          {/* Time */}
          <p className="text-muted-foreground">
            {format(new Date(dbEvent.event_date), "h:mm a")}
          </p>

          {/* Description */}
          {dbEvent.description && (
            <p className="text-muted-foreground text-sm leading-relaxed pt-2">
              {dbEvent.description}
            </p>
          )}

          {/* Host Info */}
          {host && (
            <div className="pt-4 flex items-center gap-3">
              <img
                src={host.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${host.display_name}`}
                alt={host.display_name || "Host"}
                className="h-10 w-10 rounded-full border-2 border-background"
              />
              <div>
                <p className="text-xs text-muted-foreground">Hosted by</p>
                <p className="text-sm font-medium text-foreground">{host.display_name || "Host"}</p>
              </div>
            </div>
          )}

          {/* RSVP Button */}
          <div className="pt-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                if (!user) {
                  navigate("/auth");
                } else {
                  toast({
                    title: "RSVP Submitted!",
                    description: `You're going to ${dbEvent.title}`,
                  });
                }
              }}
            >
              RSVP
            </Button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // Event not found
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
};

export default EventDetail;
