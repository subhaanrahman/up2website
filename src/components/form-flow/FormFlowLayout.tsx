import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared layout for user-flow form screens (aligned with Edit Profile + Create Event).
 * Used by: CreateOrganiserProfile, ManageAccount, ContactUs, HelpCenter, EmailVerification,
 * ResetPassword, and similar settings/support forms.
 */
export const formFlowScreenClass =
  "min-h-screen bg-background animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both";

export function FormFlowScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(formFlowScreenClass, className)}>{children}</div>;
}

export function FormFlowHeader({
  title,
  onBack,
  rightSlot,
  /** When true and `rightSlot` is omitted, reserves width so the title stays centered (Create Event pattern). */
  balanceRight = false,
  className,
}: {
  title: string;
  onBack: () => void;
  rightSlot?: ReactNode;
  balanceRight?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onBack} type="button">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-foreground text-center truncate px-2 max-w-[55%]">
          {title}
        </h1>
        <div className="shrink-0 flex min-w-[2.25rem] justify-end">
          {rightSlot ?? (balanceRight ? <span className="inline-block w-9" aria-hidden /> : null)}
        </div>
      </div>
    </header>
  );
}

export function FormFlowMain({
  children,
  className,
  withBottomNav,
}: {
  children: ReactNode;
  className?: string;
  /** Extra bottom padding when the page shows BottomNav */
  withBottomNav?: boolean;
}) {
  return (
    <main
      className={cn(
        "px-4 max-w-lg mx-auto",
        withBottomNav ? "pb-28 pt-6" : "pb-12 pt-6",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function FormFieldCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-card rounded-tile border border-border/50 overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function FormFieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5", className)}>
      {children}
    </p>
  );
}

export function FormFieldDivider() {
  return <div className="h-px bg-border/50 mx-4" />;
}

/** Native input/textarea style used inside FormFieldCard (Edit Profile pattern). */
export const formFlowInputClass =
  "w-full bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none";

export const formFlowPrimaryButtonClass =
  "w-full h-12 rounded-tile font-bold tracking-widest text-sm";
