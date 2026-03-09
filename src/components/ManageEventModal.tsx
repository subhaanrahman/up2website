import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, Image, Crown, ScanLine, Share2, Settings, BarChart3, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ShareEventLinksModal from "@/components/ShareEventLinksModal";
import AttendeeBroadcastModal from "@/components/AttendeeBroadcastModal";

interface ManageEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const ManageEventModal = ({ open, onOpenChange, eventId, eventTitle }: ManageEventModalProps) => {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const goTo = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const items = [
    { icon: ClipboardList, label: "Orders, Guestlists & Refunds", description: "View all ticket orders, guest lists, and refunds", action: () => goTo(`/events/${eventId}/manage`) },
    { icon: ScanLine, label: "Check-In", description: "Attendee list & QR scan mode", action: () => goTo(`/events/${eventId}/checkin`) },
    { icon: Share2, label: "Share & Ticket Links", description: "Copy event link, RSVP link & QR code", action: () => { onOpenChange(false); setShareOpen(true); } },
    { icon: Megaphone, label: "Message Attendees", description: "Broadcast a message to all guests", action: () => { onOpenChange(false); setBroadcastOpen(true); } },
    { icon: Image, label: "Upload Media", description: "Add event photo gallery", action: () => goTo(`/events/${eventId}/manage`) },
    { icon: Settings, label: "Event Settings", description: "Edit event details", action: () => goTo(`/events/${eventId}/edit`) },
    { icon: BarChart3, label: "Analytics", description: "Views, sales & revenue tracking", action: () => goTo(`/events/${eventId}/analytics`) },
    { icon: Crown, label: "VIP Tables — Coming Soon", description: "Manage VIP table bookings", action: () => {}, disabled: true },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Manage Event</DialogTitle>
            <p className="text-sm text-muted-foreground capitalize">{eventTitle}</p>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {items.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-3"
                onClick={item.action}
                disabled={item.disabled}
              >
                <item.icon className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <ShareEventLinksModal open={shareOpen} onOpenChange={setShareOpen} eventId={eventId} eventTitle={eventTitle} />
    </>
  );
};

export default ManageEventModal;
