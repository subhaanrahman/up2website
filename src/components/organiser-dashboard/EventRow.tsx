import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Settings, ScanLine } from "lucide-react";
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
    <div className="flex items-center bg-card rounded-2xl overflow-hidden">
      <Link
        to={`/events/${event.id}`}
        className="flex items-center flex-1 min-w-0 hover:bg-card/80 transition-colors"
      >
        <div className="w-24 h-24 flex-shrink-0 relative">
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
        <div className="flex-1 px-3 py-2 min-w-0">
          <h3 className="font-bold text-sm text-foreground line-clamp-1 capitalize leading-tight">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[11px] bg-secondary px-2 py-1 rounded-full text-muted-foreground font-medium">
              {format(new Date(event.event_date), "EEE M/d")}
            </span>
            <span className="text-[11px] bg-secondary px-2 py-1 rounded-full text-muted-foreground font-medium">
              {rsvpCount} going
            </span>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-1 pr-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.preventDefault();
            navigate(`/events/${event.id}/edit`);
          }}
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
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
