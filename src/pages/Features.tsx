import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { Reveal } from "@/components/marketing/Reveal";
import { FeatureGrid } from "@/components/marketing/sections/FeatureGrid";
import { CtaBand } from "@/components/marketing/sections/CtaBand";
import {
  BellRing,
  Fingerprint,
  LayoutGrid,
  MessageCircle,
  QrCode,
  Share2,
} from "lucide-react";

const items = [
  {
    icon: LayoutGrid,
    title: "Structured discovery",
    description:
      "Help guests browse with intent, not infinite noise, so the right events find the right crowds.",
  },
  {
    icon: Share2,
    title: "Shareable moments",
    description: "Make releases easy to share with creative that stays on-brand across channels.",
  },
  {
    icon: QrCode,
    title: "Door-ready workflows",
    description: "Reduce friction at entry with clear guest states and staff-friendly flows.",
  },
  {
    icon: MessageCircle,
    title: "Community signals",
    description: "Build belonging without turning your brand into a generic feed.",
  },
  {
    icon: BellRing,
    title: "Timely updates",
    description: "Keep your core audience informed when it matters: drops, changes, and last-minute magic.",
  },
  {
    icon: Fingerprint,
    title: "Identity you can trust",
    description: "Reduce ambiguity with clearer roles and safer interactions for guests and teams.",
  },
];

export default function Features() {
  return (
    <MarketingLayout>
      <Seo
        title="Features"
        description="Platform capabilities for discovery, community, ticketing workflows, and operator-grade trust."
      />
      <div className="border-b border-border/60 bg-gradient-to-b from-card/40 to-background py-16 md:py-20">
        <Reveal className="container max-w-3xl text-center">
          <p className="text-label mb-3 text-primary">Features</p>
          <h1 className="mb-6 text-4xl md:text-5xl">Everything you need, nothing you do not</h1>
          <p className="text-lg text-muted-foreground">
            A focused toolkit for modern nightlife and live events. This is a marketing overview; specifics can be
            tailored for your rollout.
          </p>
        </Reveal>
      </div>

      <FeatureGrid
        eyebrow="Platform"
        heading="Designed as a system, not a pile of plugins"
        features={items}
      />

      <CtaBand
        heading="See it in motion"
        body="Follow the journey from publish to packed room, then learn why we built Up2 the way we did."
        primary={{ to: "/how-it-works", label: "How it works" }}
        secondary={{ to: "/about", label: "About" }}
      />
    </MarketingLayout>
  );
}
