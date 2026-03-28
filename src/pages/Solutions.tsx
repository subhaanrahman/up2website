import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { FeatureGrid } from "@/components/marketing/sections/FeatureGrid";
import { CtaBand } from "@/components/marketing/sections/CtaBand";
import { Building2, Megaphone, Mic2, Wine } from "lucide-react";

const forVenues = [
  {
    icon: Building2,
    title: "Own the narrative",
    description: "Present programming with clarity — residents, guests, and partners see one cohesive story.",
  },
  {
    icon: Wine,
    title: "Hospitality-grade polish",
    description: "Match the on-premise experience with digital touchpoints that feel premium, not patched together.",
  },
  {
    icon: Mic2,
    title: "Talent & production friendly",
    description: "Give teams lightweight tools so marketing stays fast — without sacrificing brand control.",
  },
];

const forOrganisers = [
  {
    icon: Megaphone,
    title: "Campaigns that convert",
    description: "Structure releases so hype turns into attendance — with fewer dead ends and clearer CTAs.",
  },
  {
    icon: Building2,
    title: "Multi-venue consistency",
    description: "Touring and multi-city programming stays on-brand with shared playbooks and repeatable assets.",
  },
  {
    icon: Wine,
    title: "Sponsor-ready storytelling",
    description: "Show impact with a product story sponsors understand — discovery, audience, and outcomes.",
  },
];

export default function Solutions() {
  return (
    <MarketingLayout>
      <Seo
        title="Solutions"
        description="Up2 for venues, organisers, and brands — tailored positioning for teams who run serious programming."
      />
      <div className="border-b border-border/60 bg-gradient-to-b from-card/40 to-background py-16 md:py-20">
        <div className="container max-w-3xl text-center">
          <p className="text-label mb-3 text-primary">Solutions</p>
          <h1 className="mb-6 text-4xl md:text-5xl">Pick your lane. Keep the same premium backbone.</h1>
          <p className="text-lg text-muted-foreground">
            Up2 adapts to how you operate — whether you run rooms, tours, festivals, or brand-led experiences.
          </p>
        </div>
      </div>

      <FeatureGrid
        eyebrow="For venues & room operators"
        heading="Make the door-to-dancefloor story seamless"
        subheading="Give guests confidence before they arrive — and give your team fewer tools to juggle."
        features={forVenues}
        columns={3}
      />

      <FeatureGrid
        eyebrow="For promoters & organisers"
        heading="Ship moments faster — without losing the plot"
        subheading="Built for teams who move weekly, not quarterly."
        features={forOrganisers}
        columns={3}
      />

      <CtaBand
        heading="Tell us which lane you are in"
        body="We will map the right rollout narrative — venues, touring, festivals, or brand partnerships."
        primary={{ to: "/contact", label: "Start the conversation" }}
        secondary={{ to: "/features", label: "See platform features" }}
      />
    </MarketingLayout>
  );
}
