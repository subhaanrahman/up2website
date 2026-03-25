import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { supportRepository } from "@/features/support/repositories/supportRepository";
import { useAuth } from "@/contexts/AuthContext";
import {
  FormFieldCard,
  FormFieldDivider,
  FormFieldLabel,
  FormFlowHeader,
  FormFlowMain,
  FormFlowScreen,
  formFlowInputClass,
  formFlowPrimaryButtonClass,
} from "@/components/form-flow/FormFlowLayout";
import { cn } from "@/lib/utils";

const ContactUs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (subject.length > 200 || message.length > 2000) {
      toast({ title: "Message too long", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await supportRepository.submitContactMessage({ userId: user?.id || null, subject: subject.trim(), message: message.trim() });
      setSubject("");
      setMessage("");
      toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <FormFlowScreen>
      <FormFlowHeader title="Contact" onBack={() => navigate(-1)} balanceRight />
      <FormFlowMain withBottomNav>
        <div className="space-y-3">
          <FormFieldCard>
            <div className="px-4 pt-4 pb-3">
              <FormFieldLabel>Subject</FormFieldLabel>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
                maxLength={200}
                className={formFlowInputClass}
              />
            </div>
            <FormFieldDivider />
            <div className="px-4 pt-3 pb-4">
              <FormFieldLabel>Message</FormFieldLabel>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more…"
                rows={5}
                maxLength={2000}
                className={cn(formFlowInputClass, "resize-none leading-relaxed min-h-[120px]")}
              />
            </div>
          </FormFieldCard>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!subject.trim() || !message.trim() || sending}
            className={formFlowPrimaryButtonClass}
          >
            {sending ? "SENDING…" : "SEND MESSAGE"}
          </Button>
        </div>

        <div className="mt-10 space-y-2">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Or reach us</p>
          <a
            href="mailto:support@socialsoiree.app"
            className="flex items-center gap-3 p-4 rounded-tile border border-border/50 bg-card hover:bg-card/80 transition-colors"
          >
            <Mail className="h-5 w-5 text-foreground shrink-0" />
            <span className="text-foreground text-sm font-medium">support@socialsoiree.app</span>
          </a>
          <a
            href="https://instagram.com/socialsoiree"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-tile border border-border/50 bg-card hover:bg-card/80 transition-colors"
          >
            <Instagram className="h-5 w-5 text-foreground shrink-0" />
            <span className="text-foreground text-sm font-medium">@socialsoiree</span>
          </a>
          <a
            href="https://twitter.com/socialsoiree"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-tile border border-border/50 bg-card hover:bg-card/80 transition-colors"
          >
            <Twitter className="h-5 w-5 text-foreground shrink-0" />
            <span className="text-foreground text-sm font-medium">@socialsoiree</span>
          </a>
        </div>
      </FormFlowMain>

      <BottomNav />
    </FormFlowScreen>
  );
};

export default ContactUs;
