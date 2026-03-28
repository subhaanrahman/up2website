import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is Up2?",
    a: "Up2 is a platform for nightlife and live experiences — helping guests discover events, build community, and move smoothly from interest to attendance.",
  },
  {
    q: "Who is Up2 for?",
    a: "Venues, promoters, festivals, and brands that care about premium presentation, trust, and operational clarity — not generic social noise.",
  },
  {
    q: "Is this a consumer app marketing site?",
    a: "This repository is configured as a marketing website. Product functionality is not the focus here — positioning, partnerships, and conversion are.",
  },
  {
    q: "Do you support enterprise security reviews?",
    a: "Yes — for Operator and Enterprise rollouts. Share your requirements and we will align on controls, data handling, and integration needs.",
  },
  {
    q: "How do pricing and contracts work?",
    a: "Pricing is tailored to your footprint, markets, and required integrations. Start with a conversation — we will propose a clear package.",
  },
];

export default function FAQ() {
  return (
    <MarketingLayout>
      <Seo
        title="FAQ"
        description="Answers to common questions about Up2 for venues, organisers, and brand partners."
      />
      <div className="border-b border-border/60 bg-gradient-to-b from-card/40 to-background py-16 md:py-20">
        <div className="container max-w-3xl text-center">
          <p className="text-label mb-3 text-primary">FAQ</p>
          <h1 className="mb-6 text-4xl md:text-5xl">Questions, answered</h1>
          <p className="text-lg text-muted-foreground">Straightforward answers — no jargon wall.</p>
        </div>
      </div>

      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </MarketingLayout>
  );
}
