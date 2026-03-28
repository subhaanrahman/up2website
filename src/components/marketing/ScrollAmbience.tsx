import { useScrollCssVars } from "@/hooks/useScrollCssVars";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Fixed atmospheric layers: soft primary glow + grid that shifts with scroll. Pointer-events none.
 */
export function ScrollAmbience() {
  useScrollCssVars();
  const reduced = usePrefersReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -left-1/4 top-0 h-[min(80vh,600px)] w-[min(100vw,900px)] rounded-full opacity-[0.14] blur-[100px] motion-safe:transition-transform motion-safe:duration-1000 motion-safe:ease-out"
        style={
          reduced
            ? {
                background:
                  "radial-gradient(ellipse at center, hsl(var(--primary) / 0.45) 0%, transparent 70%)",
              }
            : {
                transform:
                  "translate3d(calc(var(--scroll-progress, 0) * 8vw), calc(var(--scroll-progress, 0) * 40px), 0)",
                background:
                  "radial-gradient(ellipse at center, hsl(var(--primary) / 0.55) 0%, transparent 70%)",
              }
        }
      />
      <div
        className="absolute -right-1/4 bottom-0 h-[min(70vh,520px)] w-[min(90vw,800px)] rounded-full opacity-[0.08] blur-[90px] motion-safe:transition-transform motion-safe:duration-1000 motion-safe:ease-out"
        style={
          reduced
            ? {
                background:
                  "radial-gradient(ellipse at center, hsl(280 40% 40% / 0.35) 0%, transparent 68%)",
              }
            : {
                transform:
                  "translate3d(calc(var(--scroll-progress, 0) * -6vw), calc(var(--scroll-progress, 0) * -30px), 0)",
                background:
                  "radial-gradient(ellipse at center, hsl(280 40% 40% / 0.4) 0%, transparent 68%)",
              }
        }
      />
      <div
        className="absolute inset-0 opacity-[0.035] motion-safe:transition-transform motion-safe:duration-700"
        style={
          reduced
            ? undefined
            : {
                transform: "translateY(calc(var(--scroll-y, 0px) * -0.08))",
                backgroundImage: `
                  linear-gradient(hsl(var(--border) / 0.9) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--border) / 0.9) 1px, transparent 1px)
                `,
                backgroundSize: "64px 64px",
                maskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
              }
        }
      />
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-70" />
    </div>
  );
}
