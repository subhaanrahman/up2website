import { useEffect } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Sets `--scroll-y` and `--scroll-progress` (0–1) on `document.documentElement` for CSS-driven parallax / ambience.
 */
export function useScrollCssVars(): void {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      document.documentElement.style.setProperty("--scroll-y", "0px");
      document.documentElement.style.setProperty("--scroll-progress", "0");
      return;
    }

    const setVars = () => {
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = y / max;
      document.documentElement.style.setProperty("--scroll-y", `${y}px`);
      document.documentElement.style.setProperty("--scroll-progress", String(Math.min(1, Math.max(0, p))));
    };

    setVars();
    window.addEventListener("scroll", setVars, { passive: true });
    window.addEventListener("resize", setVars, { passive: true });
    return () => {
      window.removeEventListener("scroll", setVars);
      window.removeEventListener("resize", setVars);
    };
  }, [reduced]);
}
