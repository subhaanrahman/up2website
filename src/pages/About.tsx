import { useNavigate } from "react-router-dom";
import { ArrowLeft, Instagram, Twitter, Facebook, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const socialLinks = [
  { icon: Instagram, label: "Instagram", url: "https://instagram.com" },
  { icon: Twitter, label: "Twitter", url: "https://twitter.com" },
  { icon: Facebook, label: "Facebook", url: "https://facebook.com" },
];

const legalLinks = [
  { label: "Terms of Service", url: "/terms" },
  { label: "Privacy Policy", url: "/privacy" },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">About</h1>
        </div>
      </header>

      <main className="px-4 pt-6">
        {/* App Info */}
        <div className="text-center mb-8">
          <div className="h-20 w-20 rounded-tile bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">EventApp</h2>
          <p className="text-muted-foreground">
            Discover and attend amazing events in your city
          </p>
        </div>

        {/* Description */}
        <div className="bg-card rounded-tile-sm p-4 mb-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            EventApp connects you with the best events, parties, and experiences in your area. 
            Whether you're looking for nightlife, concerts, networking events, or private gatherings, 
            we've got you covered.
          </p>
        </div>

        {/* Social Links */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Follow Us
          </h3>
          <div className="flex gap-3">
            {socialLinks.map((social) => (
              <Button
                key={social.label}
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => window.open(social.url, "_blank")}
              >
                <social.icon className="h-5 w-5" />
              </Button>
            ))}
          </div>
        </div>

        {/* Legal Links */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Legal
          </h3>
          <div className="space-y-2">
            {legalLinks.map((link) => (
              <Button
                key={link.label}
                variant="ghost"
                className="w-full justify-between h-12 px-4 bg-card"
                onClick={() => navigate(link.url)}
              >
                <span className="text-foreground">{link.label}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>

        {/* Version */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">© 2024 EventApp. All rights reserved.</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default About;
