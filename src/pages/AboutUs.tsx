import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { Reveal } from "@/components/marketing/Reveal";
import { CtaBand } from "@/components/marketing/sections/CtaBand";
import logoFull from "@/assets/logo-full.png";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "@/lib/brand";

export default function AboutUs() {
  return (
    <MarketingLayout>
      <Seo
        title="About"
        description={`${PRODUCT_NAME} exists to make nightlife and live experiences easier to discover, trust, and attend, with product craft worthy of the culture.`}
      />
      <div className="border-b border-border/60 py-16 md:py-24">
        <div className="container max-w-3xl">
          <Reveal>
            <div className="mb-10 flex justify-center">
              <img src={logoFull} alt={PRODUCT_NAME} className="h-12 w-auto md:h-14" />
            </div>
            <h1 className="mb-8 text-center text-4xl md:text-5xl">Built for the room, and everyone trying to find it</h1>
            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
              <p>
                {PRODUCT_NAME} started from a simple tension: the best nights are human, messy, and electric, but the
                software around them rarely matches that energy. Too many tabs. Too little trust. Too much noise.
              </p>
              <p>
                We are building a premium platform for discovery, community, and operations, so venues, organisers, and
                brands can move faster without cheapening the experience on the floor.
              </p>
              <p>
                This site is intentionally small: a clear snapshot of what {PRODUCT_NAME} is for and how we think about
                the space.
              </p>
              <p className="text-base text-muted-foreground/90">
                The {PRODUCT_NAME} platform is developed and operated by{" "}
                <span className="text-foreground">{LEGAL_ENTITY_NAME}</span>.
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <section className="border-b border-border/60 py-16 md:py-20">
        <div className="container max-w-3xl">
          <Reveal delayMs={80}>
            <h2 className="mb-6 text-2xl md:text-3xl">Principles</h2>
            <ul className="list-disc space-y-4 pl-5 text-muted-foreground">
              <li>Craft over clutter: fewer surfaces, clearer intent.</li>
              <li>Trust is a product feature: identity, roles, and safety matter.</li>
              <li>Operators win when guests feel confident before the first drink hits the bar.</li>
            </ul>
          </Reveal>
        </div>
      </section>

      <CtaBand
        heading="Explore the product"
        body="See what the platform covers and how teams move from idea to a packed room."
        primary={{ to: "/features", label: "Features" }}
        secondary={{ to: "/how-it-works", label: "How it works" }}
      />
    </MarketingLayout>
  );
}
