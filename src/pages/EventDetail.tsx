import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  Share2,
  Check,
  HelpCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { events } from "@/data/events";
import { useToast } from "@/hooks/use-toast";

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const event = events.find((e) => e.id === id);
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "maybe" | null>(null);

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Event not found</h1>
          <Link to="/events">
            <Button variant="outline">Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleRSVP = (status: "going" | "maybe") => {
    setRsvpStatus(status);
    toast({
      title: status === "going" ? "You're going!" : "Marked as maybe",
      description: `You've RSVP'd to ${event.title}`,
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: event.title,
        text: `Join me at ${event.title}!`,
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

  const goingGuests = event.guests.filter((g) => g.status === "going");
  const maybeGuests = event.guests.filter((g) => g.status === "maybe");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        {/* Hero Image */}
        <div className="relative h-[40vh] md:h-[50vh]">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          <div className="absolute top-24 left-4 md:left-8">
            <Link to="/events">
              <Button variant="secondary" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-xl p-6 shadow-lg">
                <Badge className="mb-4">{event.category}</Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">
                  {event.title}
                </h1>
                
                <div className="flex items-center gap-3 mb-6">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={event.host.avatar} alt={event.host.name} />
                    <AvatarFallback>{event.host.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">Hosted by</p>
                    <p className="font-medium text-card-foreground">{event.host.name}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-foreground">{event.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium text-foreground">{event.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background sm:col-span-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">{event.address}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-card-foreground mb-3">About</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </div>

              {/* Guest List */}
              <div className="bg-card rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-card-foreground">
                    Guests ({event.attendees} / {event.capacity})
                  </h2>
                </div>

                {goingGuests.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Going ({goingGuests.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {goingGuests.map((guest) => (
                        <div
                          key={guest.name}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={guest.avatar} alt={guest.name} />
                            <AvatarFallback>{guest.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">{guest.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {maybeGuests.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Maybe ({maybeGuests.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {maybeGuests.map((guest) => (
                        <div
                          key={guest.name}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={guest.avatar} alt={guest.name} />
                            <AvatarFallback>{guest.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">{guest.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - RSVP Card */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl p-6 shadow-lg sticky top-24">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  Will you be attending?
                </h3>

                <div className="space-y-3 mb-6">
                  <Button
                    className="w-full gap-2"
                    variant={rsvpStatus === "going" ? "default" : "outline"}
                    onClick={() => handleRSVP("going")}
                  >
                    <Check className="h-4 w-4" />
                    I'm Going
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant={rsvpStatus === "maybe" ? "default" : "outline"}
                    onClick={() => handleRSVP("maybe")}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Maybe
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share Event
                </Button>

                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Spots remaining</span>
                    <span className="font-medium text-foreground">
                      {event.capacity - event.attendees}
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${(event.attendees / event.capacity) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventDetail;
