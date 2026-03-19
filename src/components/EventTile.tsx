import { Link } from "react-router-dom";
import { format } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Normalized event shape for EventTile — accepts various API shapes */
export interface EventTileEvent {
  id: string;
  title: string;
  event_date?: string;
  eventDate?: string;
  venue_name?: string | null;
  venueName?: string | null;
  location?: string | null;
  cover_image?: string | null;
  coverImage?: string | null;
}

export interface EventTileProps {
  event: EventTileEvent;
  /** Link to event detail — when omitted, renders as div (no link) */
  to?: string;
  /** Optional badges after the date pill (e.g. category, Past, Draft) */
  extraBadges?: React.ReactNode;
  /** Content after the main tile (e.g. ChevronRight, action buttons). Use wrapper="div" when trailing has interactive elements. */
  trailing?: React.ReactNode;
  /** "link" = whole tile is a Link; "div" = div wrapper, Link covers image+content, trailing outside */
  wrapper?: "link" | "div";
  /** Dimmed style for past events */
  isPast?: boolean;
  /** Additional class names for the container */
  className?: string;
}

const baseClasses =
  "flex items-center bg-card rounded-tile overflow-hidden hover:bg-card/80 transition-colors";

function formatDateBadge(event: EventTileEvent): string {
  const date = event.event_date ?? event.eventDate;
  const venue = event.venue_name ?? event.venueName ?? event.location;
  if (!date) return "TBD";
  return `${format(new Date(date), "EEE MMM d '•' haaa")}${venue ? ` • ${venue}` : ""}`;
}

function getCoverImage(event: EventTileEvent): string {
  const src = event.cover_image ?? event.coverImage;
  return src || getEventFlyer(event.id);
}

const TileContent = ({ event, extraBadges }: { event: EventTileEvent; extraBadges?: React.ReactNode }) => (
  <>
    <div className="h-28 aspect-[3/4] flex-shrink-0 overflow-hidden">
      <img
        src={getCoverImage(event)}
        alt={event.title}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <div className="flex-1 pl-4 pr-2 py-3 min-w-0">
      <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-2 capitalize leading-tight">
        {event.title}
      </h3>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="primary">{formatDateBadge(event)}</Badge>
        {extraBadges}
      </div>
    </div>
  </>
);

export function EventTile({
  event,
  to,
  extraBadges,
  trailing,
  wrapper = "link",
  isPast = false,
  className,
}: EventTileProps) {
  const href = to ?? `/events/${event.id}`;
  const containerClass = cn(baseClasses, isPast && "opacity-60", className);

  const trailingContent = trailing;

  if (wrapper === "div") {
    return (
      <div className={containerClass}>
        <Link to={href} className="flex flex-1 items-center min-w-0">
          <TileContent event={event} extraBadges={extraBadges} />
        </Link>
        {trailingContent != null && (
          <div className="flex items-center gap-0.5 pl-2 pr-3 flex-shrink-0">
            {trailingContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link to={href} className={containerClass}>
      <TileContent event={event} extraBadges={extraBadges} />
      {trailingContent}
    </Link>
  );
}
