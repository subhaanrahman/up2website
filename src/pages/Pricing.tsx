import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Launch",
    price: "Custom",
    description: "Single venue or emerging promoter — core discovery + guest workflows.",
    features: ["Branded presence", "Core ticketing flows", "Standard support"],
    highlighted: false,
  },
  {
    name: "Operator",
    price: "Custom",
    description: "Multi-room operators and touring teams — shared playbooks and faster releases.",
    features: ["Team roles & workflows", "Deeper analytics", "Priority support"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Let us talk",
    description: "Festivals, groups, and brand partnerships — security, integrations, and bespoke rollout.",
    features: ["Custom integrations", "SLAs & success partner", "Executive business reviews"],
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <MarketingLayout>
      <Seo
        title="Pricing"
        description="Flexible plans for venues, promoters, and enterprise partners — tailored to how you operate."
      />
      <div className="border-b border-border/60 bg-gradient-to-b from-card/40 to-background py-16 md:py-20">
        <div className="container max-w-3xl text-center">
          <p className="text-label mb-3 text-primary">Pricing</p>
          <h1 className="mb-6 text-4xl md:text-5xl">Invest in nights that compound</h1>
          <p className="text-lg text-muted-foreground">
            We do not believe one-size-fits-all pricing for serious operators. Use these tiers as a starting point —
            final packaging depends on markets, volume, and integrations.
          </p>
        </div>
      </div>

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={cn(
                  "flex flex-col rounded-tile border p-8 shadow-sm transition-shadow",
                  t.highlighted
                    ? "border-primary/60 bg-gradient-to-b from-primary/10 to-card shadow-lg"
                    : "border-border/80 bg-card/40",
                )}
              >
                <h2 className="text-xl font-semibold tracking-normal normal-case">{t.name}</h2>
                <p className="mt-2 text-3xl font-bold text-foreground">{t.price}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                <ul className="mt-8 space-y-3 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-10" variant={t.highlighted ? "default" : "outline"}>
                  <Link to="/contact">Talk to sales</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
