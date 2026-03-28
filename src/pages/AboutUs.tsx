import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { CtaBand } from "@/components/marketing/sections/CtaBand";
import logoFull from "@/assets/logo-full.png";

export default function AboutUs() {
  return (
    <MarketingLayout>
      <Seo
        title="About"
        description="Up2 exists to make nightlife and live experiences easier to discover, trust, and attend — with product craft worthy of the culture."
      />
      <div className="border-b border-border/60 py-16 md:py-24">
        <div className="container max-w-3xl">
          <div className="mb-10 flex justify-center">
            <img src={logoFull} alt="Up2" className="h-12 w-auto md:h-14" />
          </div>
          <h1 className="mb-8 text-center text-4xl md:text-5xl">Built for the room — and everyone trying to find it</h1>
          <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
            <p>
              Up2 started from a simple tension: the best nights are human, messy, and electric — but the software around
              them rarely matches that energy. Too many tabs. Too little trust. Too much noise.
            </p>
            <p>
              We are building a premium platform for discovery, community, and operations — so venues, organisers, and
              brands can move faster without cheapening the experience on the floor.
            </p>
            <p>
              This site is intentionally focused: if you are evaluating partnerships, sponsorships, or a modern guest
              experience, you are in the right place.
            </p>
          </div>
        </div>
      </div>

      <section className="border-b border-border/60 py-16 md:py-20">
        <div className="container max-w-3xl">
          <h2 className="mb-6 text-2xl md:text-3xl">Principles</h2>
          <ul className="space-y-4 text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-primary">—</span>
              <span>Craft over clutter: fewer surfaces, clearer intent.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary">—</span>
              <span>Trust is a product feature: identity, roles, and safety matter.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary">—</span>
              <span>Operators win when guests feel confident — before the first drink hits the bar.</span>
            </li>
          </ul>
        </div>
      </section>

      <CtaBand
        heading="Work with us"
        body="Partnerships, press, and enterprise conversations — we respond quickly to serious inquiries."
        primary={{ to: "/contact", label: "Contact" }}
        secondary={{ to: "/faq", label: "Read FAQ" }}
      />
    </MarketingLayout>
  );
}
