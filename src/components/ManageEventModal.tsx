import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, RotateCcw, Image, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ManageEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const ManageEventModal = ({ open, onOpenChange, eventId, eventTitle }: ManageEventModalProps) => {
  const navigate = useNavigate();

  const goToManage = (tab?: string) => {
    onOpenChange(false);
    navigate(`/events/${eventId}/manage`);
  };

  const items = [
    { icon: ClipboardList, label: "Orders, Guestlists & Refunds", description: "View all ticket orders, guest lists, and refunds", action: () => goToManage() },
    { icon: Image, label: "Upload Media", description: "Add event photo gallery", action: () => goToManage("media") },
    { icon: Crown, label: "VIP Tables — Coming Soon", description: "Manage VIP table bookings", action: () => {}, disabled: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Manage Event</DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">{eventTitle}</p>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {items.map(({ icon: Icon, label, description, action }) => (
            <Button
              key={label}
              variant="ghost"
              className="w-full justify-start h-auto py-3 px-3"
              onClick={action}
              disabled={label === "VIP Tables"}
            >
              <Icon className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageEventModal;
