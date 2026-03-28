type Quote = {
  quote: string;
  attribution: string;
  role: string;
};

type SocialProofSectionProps = {
  eyebrow?: string;
  heading: string;
  quotes: Quote[];
};

export function SocialProofSection({
  eyebrow = "Trusted by operators who move fast",
  heading,
  quotes,
}: SocialProofSectionProps) {
  return (
    <section className="border-b border-border/60 py-20 md:py-24">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-label mb-3 text-primary">{eyebrow}</p>
          <h2 className="text-3xl md:text-4xl">{heading}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quotes.map((q) => (
            <blockquote
              key={q.attribution}
              className="surface-card flex flex-col justify-between p-6 md:p-8"
            >
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground md:text-base">&ldquo;{q.quote}&rdquo;</p>
              <footer>
                <cite className="not-italic">
                  <span className="block font-semibold text-foreground">{q.attribution}</span>
                  <span className="text-sm text-muted-foreground">{q.role}</span>
                </cite>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
