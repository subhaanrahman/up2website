import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ScrollAmbience } from "./ScrollAmbience";
import { cn } from "@/lib/utils";

type MarketingLayoutProps = {
  children: ReactNode;
};

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const location = useLocation();

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <ScrollAmbience />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main-content" className="flex-1">
          <div
            key={location.pathname}
            className={cn(
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:ease-out",
              "motion-reduce:animate-none motion-reduce:opacity-100",
            )}
          >
            {children}
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
