import { Link } from "react-router-dom";
import logoFull from "@/assets/logo-full.png";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "@/lib/brand";

const explore = [
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container grid gap-10 py-14 md:grid-cols-2">
        <div className="space-y-4">
          <img src={logoFull} alt={PRODUCT_NAME} className="h-8 w-auto" />
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            The modern platform for nightlife and live experiences, built for venues, organisers, and brands who care
            about discovery, trust, and conversion.
          </p>
        </div>

        <div className="md:justify-self-end">
          <h3 className="text-label mb-4 text-muted-foreground">Explore</h3>
          <ul className="space-y-2 text-sm">
            {explore.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 py-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {LEGAL_ENTITY_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
