import { Link } from "react-router-dom";
import { ChevronRight, ArrowRightLeft, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import { Badge } from "@/components/ui/badge";
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
  rsvpId,
  eventId,
  title,
  eventDate,
  venue,
  isPast,
  ticketStatus,
  hasPendingTransfer,
  onQrClick,
  onTransferClick,
  onCancelTransfer,
}: TicketEventCardProps) => {
  const showTransfer = onTransferClick != null && !isPast && !hasPendingTransfer;

  return (
    <Link
      to={`/events/${eventId}`}
      className={`flex items-center bg-card rounded-tile overflow-hidden hover:bg-card/80 transition-colors ${isPast ? "opacity-60" : ""}`}
    >
      <div className="h-28 aspect-[3/4] flex-shrink-0 overflow-hidden">
        <img
          src={getEventFlyer(eventId)}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex-1 pl-4 pr-2 py-3 min-w-0">
        <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-2 capitalize leading-tight">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="primary">
            {eventDate
              ? `${format(new Date(eventDate), "EEE MMM d '•' haaa")}${venue ? ` • ${venue}` : ""}`
              : "TBD"}
          </Badge>
          {hasPendingTransfer && (
            <span className="text-xs bg-amber-500/15 px-2.5 py-1.5 rounded-full text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 border border-amber-500/30">
              <Clock className="h-3 w-3" />
              Transfer pending
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 pl-2 pr-3 flex-shrink-0">
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
              onTransferClick(e);
            }}
            title="Transfer ticket"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        )}
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  );
};

export default TicketEventCard;
