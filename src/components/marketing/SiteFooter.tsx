import { Link } from "react-router-dom";
import logoFull from "@/assets/logo-full.png";

const primary = [
  { to: "/solutions", label: "Solutions" },
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
];

const company = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
];

const legal = [
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <img src={logoFull} alt="Up2" className="h-8 w-auto" />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            The modern platform for nightlife and live experiences — built for venues, organisers, and brands who
            care about discovery, trust, and conversion.
          </p>
        </div>

        <div>
          <h3 className="text-label mb-4 text-muted-foreground">Product</h3>
          <ul className="space-y-2 text-sm">
            {primary.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-label mb-4 text-muted-foreground">Company</h3>
          <ul className="space-y-2 text-sm">
            {company.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-label mb-4 text-muted-foreground">Legal</h3>
          <ul className="space-y-2 text-sm">
            {legal.map((l) => (
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
          © {new Date().getFullYear()} Up2. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
