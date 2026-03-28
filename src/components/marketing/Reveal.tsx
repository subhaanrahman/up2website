import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Extra delay after intersect (ms), for staggered sections */
  delayMs?: number;
  /** Intersection threshold 0–1 */
  threshold?: number;
};

export function Reveal({ children, className, delayMs = 0, threshold = 0.08 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        "will-change-[opacity,transform]",
        reduced
          ? "opacity-100"
          : [
              "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            ],
        className,
      )}
      style={visible && delayMs > 0 && !reduced ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
