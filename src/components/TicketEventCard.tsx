import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import { Badge } from "@/components/ui/badge";
import { getOptimizedUrl } from "@/lib/imageUtils";

export type TicketStatus = "purchased" | "going" | "pending" | "interested" | "saved";

interface TicketEventCardProps {
  rsvpId: string;
  eventId: string;
  title?: string;
  eventDate?: string;
  isPast: boolean;
  ticketStatus: TicketStatus;
  onQrClick?: (e: React.MouseEvent) => void;
}

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  purchased: { label: "Purchased", className: "bg-primary/15 text-primary border-primary/30" },
  going: { label: "RSVP'd", className: "bg-primary/10 text-primary border-primary/20" },
  pending: { label: "RSVP Pending", className: "bg-accent/10 text-accent-foreground border-accent/20" },
  interested: { label: "Interested", className: "bg-secondary text-muted-foreground border-border" },
  saved: { label: "Saved", className: "bg-secondary text-muted-foreground border-border" },
};

const TicketEventCard = ({
  rsvpId,
  eventId,
  title,
  eventDate,
  isPast,
  ticketStatus,
  onQrClick,
}: TicketEventCardProps) => {
  const cfg = statusConfig[ticketStatus];

  return (
    <Link
      to={`/events/${eventId}`}
      className={`flex items-center bg-card rounded-2xl overflow-hidden hover:bg-card/80 transition-colors ${isPast ? "opacity-60" : ""}`}
    >
      <div className="w-28 h-28 flex-shrink-0">
        <img
          src={getOptimizedUrl(getEventFlyer(eventId), 'EVENT_CARD') || getEventFlyer(eventId)}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex-1 px-4 py-3 min-w-0">
        <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-3 capitalize leading-tight">
          {title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="text-xs font-medium h-7 rounded-full px-3 bg-primary/15 text-primary border-primary/30">
            {eventDate ? format(new Date(eventDate), "EEE M/d - ha") : "TBD"}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-1 mr-3 flex-shrink-0">
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  );
};

export default TicketEventCard;
