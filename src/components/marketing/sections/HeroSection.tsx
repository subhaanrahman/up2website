import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Reveal } from "@/components/marketing/Reveal";

type HeroSectionProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  primaryCta?: { to: string; label: string };
  secondaryCta?: { to: string; label: string };
};

export function HeroSection({
  eyebrow = "Nightlife & live events",
  title,
  subtitle,
  primaryCta = { to: "/features", label: "Explore features" },
  secondaryCta = { to: "/how-it-works", label: "See how it works" },
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        className="hero-parallax-bg absolute inset-0 bg-cover bg-center opacity-[0.22] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
        style={{ backgroundImage: `url(${heroBg})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" aria-hidden />

      <div className="container relative py-20 md:py-28 lg:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            {eyebrow}
          </p>
          <h1 className="mb-6 text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">{title}</h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">{subtitle}</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button asChild size="lg" className="min-h-12 gap-2 px-8 text-base">
              <Link to={primaryCta.to}>
                {primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-h-12 border-border/80 bg-background/50 px-8 text-base backdrop-blur-sm"
            >
              <Link to={secondaryCta.to}>{secondaryCta.label}</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
