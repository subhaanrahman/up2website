import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { CtaBand } from "@/components/marketing/sections/CtaBand";

const steps = [
  {
    title: "Define your experience",
    body: "Set the story: lineup, timing, ticket tiers, and the vibe you want guests to feel before they arrive.",
  },
  {
    title: "Publish with confidence",
    body: "Launch a polished presence that reads premium on mobile — the default for nightlife discovery.",
  },
  {
    title: "Convert and operate",
    body: "Move guests from interest to attendance with clear CTAs, structured guest flows, and team-ready tools.",
  },
  {
    title: "Learn and iterate",
    body: "Understand what repeats, what stalls, and what to double down on — without a wall of charts.",
  },
];

export default function HowItWorks() {
  return (
    <MarketingLayout>
      <Seo
        title="How it works"
        description="A simple flow for teams who ship weekly programming — publish, convert, operate, iterate."
      />
      <div className="border-b border-border/60 bg-gradient-to-b from-card/40 to-background py-16 md:py-20">
        <div className="container max-w-3xl text-center">
          <p className="text-label mb-3 text-primary">How it works</p>
          <h1 className="mb-6 text-4xl md:text-5xl">A straight line from idea to packed room</h1>
          <p className="text-lg text-muted-foreground">
            Up2 is designed to reduce operational drag while keeping the brand experience elevated end-to-end.
          </p>
        </div>
      </div>

      <section className="border-b border-border/60 py-16 md:py-24">
        <div className="container max-w-3xl">
          <ol className="space-y-10">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-6">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-tile bg-primary text-lg font-bold text-primary-foreground"
                  aria-hidden
                >
                  {i + 1}
                </div>
                <div>
                  <h2 className="mb-2 text-xl font-semibold tracking-normal normal-case">{s.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand
        heading="See the platform in detail"
        body="Jump into features, pricing, and FAQs — or talk to us for a tailored walkthrough."
        primary={{ to: "/features", label: "Explore features" }}
        secondary={{ to: "/contact", label: "Book a walkthrough" }}
      />
    </MarketingLayout>
  );
}
