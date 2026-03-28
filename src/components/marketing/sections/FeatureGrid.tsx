import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/marketing/Reveal";

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type FeatureGridProps = {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  features: FeatureItem[];
  columns?: 2 | 3;
};

export function FeatureGrid({ eyebrow, heading, subheading, features, columns = 3 }: FeatureGridProps) {
  return (
    <section className="border-b border-border/60 py-20 md:py-24">
      <div className="container">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          {eyebrow ? <p className="text-label mb-3 text-primary">{eyebrow}</p> : null}
          <h2 className="mb-4 text-3xl md:text-4xl">{heading}</h2>
          {subheading ? <p className="text-lg text-muted-foreground">{subheading}</p> : null}
        </Reveal>
        <ul
          className={cn(
            "grid list-none gap-6 md:gap-8",
            columns === 3 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2",
          )}
        >
          {features.map((f, i) => (
            <li key={f.title} className="min-w-0">
              <Reveal className="h-full" delayMs={i * 55}>
                <div className="surface-card group h-full p-6 transition-shadow hover:shadow-md md:p-8">
                  <div className="mb-4 inline-flex rounded-tile-sm bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/15">
                    <f.icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-normal normal-case">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{f.description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
