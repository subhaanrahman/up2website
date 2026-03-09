import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";

interface AttendeeBroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const AttendeeBroadcastModal = ({ open, onOpenChange, eventId, eventTitle }: AttendeeBroadcastModalProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("attendee-broadcast", {
        body: { event_id: eventId, message: message.trim() },
      });
      if (error) throw error;
      toast({
        title: "Message sent!",
        description: `Notified ${data?.recipients || 0} attendee(s)`,
      });
      setMessage("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Message Attendees</DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">{eventTitle}</p>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Textarea
            placeholder="Write a message to all attendees…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
            className="bg-card border-border"
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
          <Button
            className="w-full"
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending…" : "Send to All Attendees"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendeeBroadcastModal;
