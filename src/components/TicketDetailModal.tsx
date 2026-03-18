import { useState } from "react";
import { X, Send } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface TicketDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    qrCode: string;
    status: string;
    tierName?: string;
    eventTitle?: string;
    eventDate?: string;
  } | null;
  onTransfer?: (ticketId: string, recipientUsername: string) => Promise<void>;
  transferLoading?: boolean;
}

const TicketDetailModal = ({
  open,
  onOpenChange,
  ticket,
  onTransfer,
  transferLoading,
}: TicketDetailModalProps) => {
  const [showTransfer, setShowTransfer] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState("");

  if (!ticket) return null;

  const handleTransfer = async () => {
    if (!recipientUsername.trim() || !onTransfer) return;
    await onTransfer(ticket.id, recipientUsername.trim());
    setShowTransfer(false);
    setRecipientUsername("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 bg-background">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-lg font-bold text-foreground">
            {ticket.tierName || "Ticket"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 flex flex-col items-center">
          {/* Event Info */}
          {ticket.eventTitle && (
            <div className="text-center mb-4">
              <h3 className="font-semibold text-foreground capitalize">{ticket.eventTitle}</h3>
              {ticket.eventDate && (
                <p className="text-sm text-muted-foreground">{ticket.eventDate}</p>
              )}
            </div>
          )}

          {/* QR Code */}
          <div className="bg-card p-6 rounded-tile mb-4">
            <QRCodeSVG
              value={ticket.qrCode}
              size={200}
              bgColor="transparent"
              fgColor="currentColor"
              className="text-foreground"
            />
          </div>

          <p className="text-xs text-muted-foreground font-mono mb-2">
            {ticket.qrCode.slice(0, 20)}...
          </p>

          <Badge
            variant="outline"
            className={
              ticket.status === "valid"
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : ticket.status === "used"
                ? "bg-muted text-muted-foreground"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }
          >
            {ticket.status}
          </Badge>
        </div>

        {/* Transfer Section */}
        {ticket.status === "valid" && onTransfer && (
          <div className="p-4 border-t border-border">
            {!showTransfer ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowTransfer(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Transfer Ticket
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter the recipient's username to transfer this ticket
                </p>
                <Input
                  placeholder="@username"
                  value={recipientUsername}
                  onChange={(e) => setRecipientUsername(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowTransfer(false);
                      setRecipientUsername("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!recipientUsername.trim() || transferLoading}
                    onClick={handleTransfer}
                  >
                    {transferLoading ? "Transferring..." : "Transfer"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailModal;
