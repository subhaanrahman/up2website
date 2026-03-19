import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, ScanLine } from "lucide-react";
import { format } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";

interface EventRowProps {
  event: any;
  rsvpCount: number;
  onManage: () => void;
}

const EventRow = ({ event, rsvpCount, onManage }: EventRowProps) => {
  const navigate = useNavigate();
  const isDraft = event.status === "draft";

  return (
    <div className="flex items-center bg-card rounded-tile overflow-hidden">
      <Link
        to={`/events/${event.id}`}
        className="flex items-center flex-1 min-w-0 hover:bg-card/80 transition-colors"
      >
        <div className="h-28 aspect-[3/4] flex-shrink-0 overflow-hidden relative">
          <img
            src={event.cover_image || getEventFlyer(event.id)}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          {isDraft && (
            <Badge
              variant="secondary"
              className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5"
            >
              Draft
            </Badge>
          )}
        </div>
        <div className="flex-1 pl-4 pr-2 py-3 min-w-0">
          <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-2 capitalize leading-tight">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="primary">
              {`${format(new Date(event.event_date), "EEE MMM d '•' haaa")}${(event.venue_name ?? event.location) ? ` • ${event.venue_name ?? event.location}` : ""}`}
            </Badge>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-0.5 pl-2 pr-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.preventDefault();
            onManage();
          }}
          title="Manage"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.preventDefault();
            navigate(`/events/${event.id}/checkin`);
          }}
          title="Check In"
        >
          <ScanLine className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default EventRow;
