import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface GuestProfile {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export interface GuestlistEntry {
  id: string;
  user_id: string | null;
  status: string;
  created_at: string;
  profile?: GuestProfile | null;
}

interface GuestlistApprovalListProps {
  rsvps: GuestlistEntry[];
  onApprove: (rsvpId: string) => void;
  onDecline: (rsvpId: string) => void;
  onSelectUser: (userId: string | null) => void;
}

const GuestlistApprovalList = ({ rsvps, onApprove, onDecline, onSelectUser }: GuestlistApprovalListProps) => {
  return (
    <div className="divide-y divide-border">
      {rsvps.map((rsvp) => {
        const name = rsvp.profile?.display_name
          || [rsvp.profile?.first_name, rsvp.profile?.last_name].filter(Boolean).join(" ")
          || "Unknown";
        const email = rsvp.profile?.email || "";
        const isPending = rsvp.status === "pending";

        return (
          <div key={rsvp.id} className="py-4">
            <button
              className="w-full text-left hover:bg-secondary/50 transition-colors rounded-tile-sm p-2"
              onClick={() => onSelectUser(rsvp.user_id)}
              type="button"
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{name}</p>
                  <p className="text-sm text-muted-foreground truncate">{email}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm text-foreground">
                    {format(new Date(rsvp.created_at), "d/M/yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">{rsvp.status}</p>
                </div>
              </div>
            </button>

            {isPending && (
              <div className="flex gap-2 mt-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => onDecline(rsvp.id)}>
                  Decline
                </Button>
                <Button size="sm" onClick={() => onApprove(rsvp.id)}>
                  Approve
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GuestlistApprovalList;
