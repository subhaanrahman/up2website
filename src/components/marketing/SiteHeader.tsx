import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import logoFull from "@/assets/logo-full.png";

const nav = [
  { to: "/", label: "Home", end: true },
  { to: "/solutions", label: "Solutions" },
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "text-sm font-medium transition-colors hover:text-foreground",
    isActive ? "text-foreground" : "text-muted-foreground",
  );

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logoFull} alt="Up2" className="h-7 w-auto md:h-8" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <a href="#cta-download" className="no-press">
              Get early access
            </a>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[min(100%,20rem)] flex-col gap-6">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {nav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "rounded-md px-3 py-3 text-base font-medium transition-colors",
                        isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
                      )
                    }
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <Button asChild className="mt-auto">
                <a href="#cta-download" onClick={() => setOpen(false)}>
                  Get early access
                </a>
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
