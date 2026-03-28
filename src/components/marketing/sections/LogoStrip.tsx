type LogoStripProps = {
  eyebrow?: string;
  heading?: string;
};

const PLACEHOLDERS = ["Venues", "Promoters", "Festivals", "Brands", "Hospitality"];

export function LogoStrip({
  eyebrow = "Built for serious operators",
  heading = "Partners & categories we support",
}: LogoStripProps) {
  return (
    <section className="border-b border-border/60 py-14 md:py-16">
      <div className="container text-center">
        <p className="text-label mb-2 text-muted-foreground">{eyebrow}</p>
        <h2 className="mb-10 text-xl font-semibold tracking-normal normal-case text-foreground md:text-2xl">{heading}</h2>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {PLACEHOLDERS.map((name) => (
            <div
              key={name}
              className="rounded-full border border-border/70 bg-muted/30 px-5 py-2 text-sm font-medium text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-xl text-xs text-muted-foreground">
          Replace these chips with your partner logos when assets are ready — layout and spacing are tuned for a clean
          logo row.
        </p>
      </div>
    </section>
  );
}
