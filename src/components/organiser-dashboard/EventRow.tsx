import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventTile } from "@/components/EventTile";
import { Settings, ScanLine } from "lucide-react";

interface EventRowProps {
  event: any;
  rsvpCount: number;
  onManage: () => void;
}

const EventRow = ({ event, onManage }: EventRowProps) => {
  const navigate = useNavigate();
  const isDraft = event.status === "draft";

  const trailing = (
    <div className="flex items-center gap-0.5">
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
  );

  return (
    <EventTile
      event={event}
      wrapper="div"
      extraBadges={
        isDraft ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-secondary text-secondary-foreground">
            Draft
          </span>
        ) : undefined
      }
      trailing={trailing}
    />
  );
};

export default EventRow;
