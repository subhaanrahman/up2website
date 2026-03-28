import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { HeroSection } from "@/components/marketing/sections/HeroSection";
import { FeatureGrid } from "@/components/marketing/sections/FeatureGrid";
import { LogoStrip } from "@/components/marketing/sections/LogoStrip";
import { SocialProofSection } from "@/components/marketing/sections/SocialProofSection";
import { ProductMockupSection } from "@/components/marketing/sections/ProductMockupSection";
import { CtaBand } from "@/components/marketing/sections/CtaBand";
import {
  CalendarHeart,
  LineChart,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Discovery that feels premium",
    description:
      "Position your nights and experiences with editorial-quality presentation — built to convert browsers into guests.",
  },
  {
    icon: Users,
    title: "Audience & community in one place",
    description:
      "Give superfans a home without losing the signal. Up2 is structured for real-world social graphs, not endless feeds.",
  },
  {
    icon: Ticket,
    title: "Ticketing & guest ops",
    description:
      "From RSVP to check-in, keep operations tight — fewer tools, clearer accountability, faster door flow.",
  },
  {
    icon: CalendarHeart,
    title: "Built for recurring programming",
    description:
      "Weekly residencies, tours, and one-off moments share the same backbone — consistent brand, flexible execution.",
  },
  {
    icon: LineChart,
    title: "Insights operators actually use",
    description:
      "Understand what moves tickets, who returns, and where drop-off happens — without drowning in dashboards.",
  },
  {
    icon: ShieldCheck,
    title: "Trust & safety by design",
    description:
      "Reduce fraud and confusion with clear identity signals, structured roles, and sensible controls for teams.",
  },
];

const quotes = [
  {
    quote:
      "We finally have a consumer-facing experience that matches how premium our venues feel on the ground.",
    attribution: "Placeholder",
    role: "Venue Group, Partnerships",
  },
  {
    quote:
      "The product story is clear: fewer tabs, faster decisions, better nights. That is exactly what we pitch to sponsors.",
    attribution: "Placeholder",
    role: "Independent Promoter",
  },
  {
    quote:
      "Our team cares about brand and speed. Up2 reads like a modern product — not a patchwork of spreadsheets.",
    attribution: "Placeholder",
    role: "Festival Producer",
  },
];

export default function Home() {
  return (
    <MarketingLayout>
      <Seo
        title="Up2 — Premium discovery for nightlife & live events"
        description="Up2 helps venues, organisers, and brands launch beautiful experiences, sell tickets, and build community — without losing the energy of the room."
      />
      <HeroSection
        title="Turn great nights into a growth engine"
        subtitle="Up2 is the platform for nightlife and live experiences — discovery, community, and operations in one premium experience your guests will actually want to open."
        primaryCta={{ to: "/contact", label: "Partner with us" }}
        secondaryCta={{ to: "/how-it-works", label: "How it works" }}
      />
      <LogoStrip />
      <FeatureGrid
        eyebrow="Why teams choose Up2"
        heading="Built for operators who care about craft"
        subheading="Everything here is designed to support brand, conversion, and repeat attendance — not vanity metrics."
        features={features}
      />
      <ProductMockupSection
        heading="Visual storytelling that sells the room"
        body="Flyers, lineups, and drops should feel as intentional as your production. Up2 gives you a canvas that matches the energy of your brand — while staying structured enough for teams to run at scale."
      />
      <SocialProofSection
        heading="What partners say"
        quotes={quotes}
      />
      <CtaBand
        heading="Ready to elevate your next season?"
        body="Tell us about your venues, tours, or brand activations — we will follow up with a tailored overview."
        primary={{ to: "/contact", label: "Request a conversation" }}
        secondary={{ to: "/solutions", label: "Explore solutions" }}
      />
    </MarketingLayout>
  );
}
