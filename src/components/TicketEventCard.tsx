import { ChevronRight, ArrowRightLeft, Clock, X } from "lucide-react";
import { EventTile } from "@/components/EventTile";
import { Button } from "@/components/ui/button";

export type TicketStatus = "purchased" | "going" | "pending" | "interested" | "saved" | "cohost";

interface TicketEventCardProps {
  rsvpId: string;
  eventId: string;
  title?: string;
  eventDate?: string;
  venue?: string | null;
  isPast: boolean;
  ticketStatus: TicketStatus;
  hasPendingTransfer?: boolean;
  onQrClick?: (e: React.MouseEvent) => void;
  onTransferClick?: (e: React.MouseEvent) => void;
  onCancelTransfer?: (e: React.MouseEvent) => void;
}

const TicketEventCard = ({
  eventId,
  title,
  eventDate,
  venue,
  isPast,
  hasPendingTransfer,
  onTransferClick,
  onCancelTransfer,
}: TicketEventCardProps) => {
  const showTransfer = onTransferClick != null && !isPast && !hasPendingTransfer;

  const event = {
    id: eventId,
    title: title ?? "Event",
    eventDate,
    venueName: venue,
    location: venue,
  };

  const trailing = (
    <div className="flex items-center gap-0.5">
      {hasPendingTransfer && onCancelTransfer && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancelTransfer(e);
          }}
          title="Cancel transfer"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {showTransfer && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTransferClick?.(e);
          }}
          title="Transfer ticket"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
      )}
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </div>
  );

  return (
    <EventTile
      event={event}
      to={`/events/${eventId}`}
      wrapper="div"
      isPast={isPast}
      extraBadges={
        hasPendingTransfer ? (
          <span className="text-xs bg-amber-500/15 px-2.5 py-1.5 rounded-full text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 border border-amber-500/30">
            <Clock className="h-3 w-3" />
            Transfer pending
          </span>
        ) : undefined
      }
      trailing={trailing}
    />
  );
};

export default TicketEventCard;
