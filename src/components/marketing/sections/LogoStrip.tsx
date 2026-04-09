import { Reveal } from "@/components/marketing/Reveal";

type LogoStripProps = {
  eyebrow?: string;
  heading?: string;
};

export function LogoStrip({
  eyebrow = "Built for serious operators",
  heading = "Partners & categories we support",
}: LogoStripProps) {
  return (
    <section className="border-b border-border/60 py-14 md:py-16">
      <div className="container text-center">
        <Reveal>
          <p className="text-label mb-2 text-muted-foreground">{eyebrow}</p>
          <h2 className="mb-10 text-xl font-semibold tracking-normal normal-case text-foreground md:text-2xl">
            {heading}
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Partner logos announcing soon — stay tuned.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
