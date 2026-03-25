import { useParams } from "react-router-dom";
import { useEvent } from "@/hooks/useEventsQuery";
import { useTicketTiers } from "@/hooks/useTicketTiers";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import { format } from "date-fns";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicImage } from "@/components/ui/public-image";

/**
 * Minimal embeddable event card designed to be loaded in an iframe.
 * No nav, no bottom bar — just the event info with a CTA.
 */
const EventEmbed = () => {
  const { id } = useParams();
  const { data: event, isLoading } = useEvent(id);
  const { data: tiers = [] } = useTicketTiers(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground text-sm">Event not found</p>
      </div>
    );
  }

  const coverImage = event.coverImage || getEventFlyer(event.id);
  const hasPaid = tiers.some((t) => t.priceCents > 0);
  const lowestPrice = hasPaid
    ? Math.min(...tiers.filter((t) => t.priceCents > 0).map((t) => t.priceCents))
    : 0;

  const eventUrl = `${window.location.origin}/events/${event.id}`;

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      <div className="w-full max-w-sm bg-card border border-border rounded-tile overflow-hidden shadow-lg">
        {coverImage && (
          <PublicImage
            src={coverImage}
            preset="EMBED_COVER"
            assetType="event-flyer"
            surface="event-embed-cover"
            alt={event.title}
            className="w-full aspect-video object-cover"
          />
        )}
        <div className="p-4 space-y-3">
          <h2 className="text-lg font-bold text-foreground leading-tight">{event.title}</h2>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
            <span>{format(new Date(event.eventDate), "EEE, MMM d • h:mm a")}</span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {hasPaid && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ticket className="h-4 w-4 text-primary flex-shrink-0" />
              <span>From R{(lowestPrice / 100).toFixed(2)}</span>
            </div>
          )}

          <a href={eventUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full">
              {hasPaid ? "Get Tickets" : "RSVP Now"}
            </Button>
          </a>

          <p className="text-[10px] text-center text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">Social Soirée</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventEmbed;
