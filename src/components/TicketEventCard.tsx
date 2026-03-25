import {
  ChevronRight,
  ArrowRightLeft,
  Clock,
  X,
  RotateCcw,
  Bookmark,
  Check,
  Ticket,
  Star,
  Users,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventTile } from "@/components/EventTile";

export type TicketStatus =
  | "purchased"
  | "going"
  | "pending"
  | "interested"
  | "saved"
  | "cohost"
  | "hosting";

function ticketStatusPill(status: TicketStatus) {
  const base =
    "text-xs px-2.5 py-1.5 rounded-full font-medium flex items-center gap-1 border";
  switch (status) {
    case "saved":
      return (
        <span className={`${base} bg-muted/50 text-muted-foreground border-border/70`}>
          <Bookmark className="h-3 w-3 shrink-0" />
          Saved
        </span>
      );
    case "going":
      return (
        <span
          className={`${base} bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30`}
        >
          <Check className="h-3 w-3 shrink-0" />
          RSVP&apos;d
        </span>
      );
    case "purchased":
      return (
        <span className={`${base} bg-primary/15 text-primary border-primary/25`}>
          <Ticket className="h-3 w-3 shrink-0" />
          Ticket
        </span>
      );
    case "pending":
      return (
        <span className={`${base} bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30`}>
          <Clock className="h-3 w-3 shrink-0" />
          Pending
        </span>
      );
    case "interested":
      return (
        <span className={`${base} bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/25`}>
          <Star className="h-3 w-3 shrink-0" />
          Interested
        </span>
      );
    case "cohost":
      return (
        <span className={`${base} bg-violet-500/12 text-violet-800 dark:text-violet-300 border-violet-500/25`}>
          <Users className="h-3 w-3 shrink-0" />
          Co-host
        </span>
      );
    case "hosting":
      return (
        <span className={`${base} bg-amber-500/12 text-amber-900 dark:text-amber-300 border-amber-500/25`}>
          <Crown className="h-3 w-3 shrink-0" />
          Hosting
        </span>
      );
    default:
      return null;
  }
}

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
  canRequestRefund?: boolean;
  refundLoading?: boolean;
  onRefundClick?: (e: React.MouseEvent) => void;
}

const TicketEventCard = ({
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
  canRequestRefund,
  refundLoading,
  onRefundClick,
}: TicketEventCardProps) => {
  const showTransfer = onTransferClick != null && !isPast && !hasPendingTransfer;
  const showRefund =
    onRefundClick != null &&
    canRequestRefund &&
    !isPast &&
    ticketStatus === "purchased" &&
    !hasPendingTransfer;

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
      {showRefund && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          disabled={refundLoading}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRefundClick?.(e);
          }}
          title="Request refund"
        >
          <RotateCcw className="h-4 w-4" />
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
        <>
          {ticketStatusPill(ticketStatus)}
          {hasPendingTransfer ? (
            <span className="text-xs bg-amber-500/15 px-2.5 py-1.5 rounded-full text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 border border-amber-500/30">
              <Clock className="h-3 w-3 shrink-0" />
              Transfer pending
            </span>
          ) : null}
        </>
      }
      trailing={trailing}
    />
  );
};

export default TicketEventCard;
