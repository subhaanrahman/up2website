import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link, UserPlus, Code } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ShareEventLinksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const ShareEventLinksModal = ({ open, onOpenChange, eventId, eventTitle }: ShareEventLinksModalProps) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const eventUrl = `${window.location.origin}/events/${eventId}`;
  const rsvpUrl = `${eventUrl}?action=rsvp`;

  const copyToClipboard = async (url: string, label: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedLink(url);
    toast({ title: `${label} copied!` });
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Share & Ticket Links</DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">{eventTitle}</p>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <div className="rounded-xl border bg-card p-4">
            <QRCodeSVG value={eventUrl} size={180} />
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-3 px-4"
            onClick={() => copyToClipboard(eventUrl, "Event link")}
          >
            <span className="flex items-center gap-2 text-left">
              <Link className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">Event Link</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{eventUrl}</p>
              </div>
            </span>
            {copiedLink === eventUrl ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between h-auto py-3 px-4"
            onClick={() => copyToClipboard(rsvpUrl, "RSVP link")}
          >
            <span className="flex items-center gap-2 text-left">
              <UserPlus className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">RSVP / Ticket Link</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{rsvpUrl}</p>
              </div>
            </span>
            {copiedLink === rsvpUrl ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareEventLinksModal;
