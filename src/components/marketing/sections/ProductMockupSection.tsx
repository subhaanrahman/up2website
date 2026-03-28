import flyer1 from "@/assets/flyer-1.jpg";
import flyer2 from "@/assets/flyer-2.jpg";
import flyer3 from "@/assets/flyer-3.jpg";
import { Reveal } from "@/components/marketing/Reveal";

type ProductMockupSectionProps = {
  eyebrow?: string;
  heading: string;
  body: string;
};

export function ProductMockupSection({
  eyebrow = "Product preview",
  heading,
  body,
}: ProductMockupSectionProps) {
  const imgs = [flyer1, flyer2, flyer3];

  return (
    <section className="border-b border-border/60 py-20 md:py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div>
              <p className="text-label mb-3 text-primary">{eyebrow}</p>
              <h2 className="mb-4 text-3xl md:text-4xl">{heading}</h2>
              <p className="text-lg text-muted-foreground">{body}</p>
            </div>
          </Reveal>
          <Reveal delayMs={100} className="min-w-0">
            <div className="relative mx-auto w-full max-w-xl">
              <div
                className="absolute -inset-6 rounded-tile bg-gradient-to-tr from-primary/25 to-transparent blur-3xl"
                aria-hidden
              />
              <div className="relative flex items-end justify-center gap-3 md:gap-4">
                {imgs.map((src, i) => (
                  <div
                    key={i}
                    className="w-1/3 overflow-hidden rounded-tile border border-border/80 shadow-2xl ring-1 ring-white/5"
                    style={{ transform: `translateY(${i % 2 === 0 ? 0 : 12}px)` }}
                  >
                    <img src={src} alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
