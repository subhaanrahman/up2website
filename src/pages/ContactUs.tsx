import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { supportRepository } from "@/features/support/repositories/supportRepository";
import { useAuth } from "@/contexts/AuthContext";

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
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Contact Us</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us more…"
              rows={5}
              maxLength={2000}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!subject.trim() || !message.trim() || sending}
            className="w-full"
          >
            {sending ? "Sending…" : "Send Message"}
          </Button>
        </div>

        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Or reach us directly
          </h2>

          <a
            href="mailto:support@socialsoiree.app"
            className="flex items-center gap-3 p-3 rounded-tile-sm border border-border hover:bg-secondary transition-colors"
          >
            <Mail className="h-5 w-5 text-foreground" />
            <span className="text-foreground text-sm">support@socialsoiree.app</span>
          </a>

          <a
            href="https://instagram.com/socialsoiree"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-tile-sm border border-border hover:bg-secondary transition-colors"
          >
            <Instagram className="h-5 w-5 text-foreground" />
            <span className="text-foreground text-sm">@socialsoiree</span>
          </a>

          <a
            href="https://twitter.com/socialsoiree"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-tile-sm border border-border hover:bg-secondary transition-colors"
          >
            <Twitter className="h-5 w-5 text-foreground" />
            <span className="text-foreground text-sm">@socialsoiree</span>
          </a>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ContactUs;
