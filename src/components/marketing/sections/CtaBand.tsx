import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/Reveal";

type CtaBandProps = {
  id?: string;
  heading: string;
  body: string;
  primary: { to: string; label: string };
  secondary?: { to: string; label: string };
};

export function CtaBand({ id = "cta-download", heading, body, primary, secondary }: CtaBandProps) {
  return (
    <section
      id={id}
      className="border-b border-border/60 bg-gradient-to-br from-primary/15 via-background to-background py-20 md:py-24"
    >
      <div className="container">
        <Reveal>
          <div className="mx-auto max-w-3xl rounded-tile border border-border/70 bg-card/40 p-10 text-center shadow-lg backdrop-blur-md md:p-14">
            <h2 className="mb-4 text-3xl md:text-4xl">{heading}</h2>
            <p className="mb-8 text-lg text-muted-foreground">{body}</p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button asChild size="lg" className="min-h-12 px-8">
                <Link to={primary.to}>{primary.label}</Link>
              </Button>
              {secondary ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="min-h-12 border-border/80 bg-background/40 px-8 backdrop-blur-sm"
                >
                  <Link to={secondary.to}>{secondary.label}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
