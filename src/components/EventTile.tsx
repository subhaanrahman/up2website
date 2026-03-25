import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicImage } from "@/components/ui/public-image";
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
  /** Optional badge shown to the right of the date pill in the same row */
  dateRightBadge?: React.ReactNode;
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
  /** Icon quick actions (e.g. save, share), bottom-left of the tile */
  secondaryActions?: {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    icon?: React.ReactNode;
    ariaLabel?: string;
  }[];
  /** Prefetch callback for hover/touch/focus navigation intent */
  onNavigateIntent?: () => void;
}

const baseClasses =
  "flex items-center bg-card rounded-tile-sm border border-border/70 shadow-sm overflow-hidden hover:bg-card/80 transition-colors min-h-[7rem]";

function formatDateBadge(event: EventTileEvent): string {
  const date = event.event_date ?? event.eventDate;
  if (!date) return "TBD";
  return format(new Date(date), "EEE MMM d '•' haaa");
}

function getVenue(event: EventTileEvent): string | null {
  const v = event.venue_name ?? event.venueName ?? event.location;
  return v ?? null;
}

function getCoverImage(event: EventTileEvent): string {
  const src = event.cover_image ?? event.coverImage;
  return src || getEventFlyer(event.id);
}

function SecondaryActionButtons({
  actions,
}: {
  actions: NonNullable<EventTileProps["secondaryActions"]>;
}) {
  return (
    <div
      className="flex items-center gap-1 shrink-0 pointer-events-auto"
      role="group"
      aria-label="Event actions"
    >
      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="secondary"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full border border-border/80 bg-secondary/90 shadow-sm backdrop-blur-[2px]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            action.onClick(e);
          }}
          disabled={action.disabled}
          aria-label={action.ariaLabel || action.label}
        >
          {action.icon ?? <span className="sr-only">{action.label}</span>}
        </Button>
      ))}
    </div>
  );
}

const TileContent = ({
  event,
  dateRightBadge,
  extraBadges,
}: {
  event: EventTileEvent;
  dateRightBadge?: React.ReactNode;
  extraBadges?: React.ReactNode;
}) => {
  const venue = getVenue(event);
  const coverImage = getCoverImage(event);
  return (
    <>
      <div className="h-28 aspect-[3/4] flex-shrink-0 overflow-hidden">
        <PublicImage
          src={coverImage}
          preset="EVENT_CARD"
          assetType="event-flyer"
          surface="event-tile"
          responsiveWidths={[220, 420, 720]}
          sizes="(max-width: 768px) 28vw, 140px"
          alt={event.title}
          className="w-full h-full object-cover bg-secondary/50"
        />
      </div>
      <div className="flex-1 pl-4 pr-2 py-2 min-w-0 flex flex-col justify-center">
        <h3 className="font-bold text-base text-foreground line-clamp-2 mb-1 capitalize leading-tight">
          {event.title}
        </h3>
        <div className="flex flex-col gap-1 min-h-[2.75rem]">
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            <Badge variant="primary" className="text-[11px] py-1 px-2 gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {formatDateBadge(event)}
            </Badge>
            {dateRightBadge != null && (
              <div className="flex-shrink-0">{dateRightBadge}</div>
            )}
          </div>
          {venue ? (
            <div className="flex items-start gap-2 min-w-0 w-full">
              <Badge
                variant="outline"
                className="w-fit max-w-full break-words text-[11px] py-1 px-2 gap-1 border border-muted-foreground/[0.35] bg-muted-foreground/10 text-white whitespace-normal text-left items-start h-auto min-w-0"
              >
                <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                {venue}
              </Badge>
            </div>
          ) : null}
          {extraBadges && (
            <div className="flex items-center gap-1 flex-wrap">
              {extraBadges}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export function EventTile({
  event,
  to,
  dateRightBadge,
  extraBadges,
  trailing,
  wrapper = "link",
  isPast = false,
  className,
  secondaryActions,
  onNavigateIntent,
}: EventTileProps) {
  const href = to ?? `/events/${event.id}`;
  const containerClass = cn(baseClasses, isPast && "opacity-60", className);
  const hasQuickActions = !!(secondaryActions && secondaryActions.length > 0);
  const effectiveWrapper = hasQuickActions ? "div" : wrapper;

  const trailingContent = trailing;

  if (effectiveWrapper === "div") {
    return (
      <div className={cn(containerClass, "relative")}>
        <Link
          to={href}
          className="flex flex-1 items-center min-w-0"
          onMouseEnter={onNavigateIntent}
          onTouchStart={onNavigateIntent}
          onFocus={onNavigateIntent}
        >
          <TileContent
            event={event}
            dateRightBadge={dateRightBadge}
            extraBadges={extraBadges}
          />
        </Link>
        {trailingContent != null && (
          <div className="flex items-center gap-0.5 pl-2 pr-3 flex-shrink-0">
            {trailingContent}
          </div>
        )}
        {secondaryActions && secondaryActions.length > 0 && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-10">
            <SecondaryActionButtons actions={secondaryActions} />
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className={containerClass}
      onMouseEnter={onNavigateIntent}
      onTouchStart={onNavigateIntent}
      onFocus={onNavigateIntent}
    >
      <TileContent event={event} dateRightBadge={dateRightBadge} extraBadges={extraBadges} />
      {trailingContent}
    </Link>
  );
}
