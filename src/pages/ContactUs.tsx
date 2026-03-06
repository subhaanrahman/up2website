import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const ContactUs = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    setSubject("");
    setMessage("");
    toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
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
        {/* Contact form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
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

        {/* Quick links */}
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Or reach us directly
          </h2>

          <a
            href="mailto:support@socialsoiree.app"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
          >
            <Mail className="h-5 w-5 text-foreground" />
            <span className="text-foreground text-sm">support@socialsoiree.app</span>
          </a>

          <a
            href="https://instagram.com/socialsoiree"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
          >
            <Instagram className="h-5 w-5 text-foreground" />
            <span className="text-foreground text-sm">@socialsoiree</span>
          </a>

          <a
            href="https://twitter.com/socialsoiree"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
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
