import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MOBILE_TAB_HEADER_CLASS, MOBILE_TAB_HEADER_TITLE_CLASS } from "@/lib/pageHeaderStyles";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  className?: string;
  dense?: boolean;
  /** Match Tickets / Search mobile tab header (typography + padding). */
  variant?: "default" | "tabMain";
}

const AppHeader = ({
  title,
  subtitle,
  onBack,
  rightSlot,
  className,
  dense = false,
  variant = "default",
}: AppHeaderProps) => {
  const tabMain = variant === "tabMain";
  const hasSides = Boolean(onBack || rightSlot);

  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        tabMain
          ? MOBILE_TAB_HEADER_CLASS
          : "border-b border-border bg-background/85 backdrop-blur-md",
        className,
      )}
    >
      <div
        className={cn(
          "relative",
          !tabMain && "px-4",
          !tabMain && (dense ? "py-2.5" : "py-3.5"),
        )}
      >
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="absolute left-2 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : null}

        {rightSlot ? (
          <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2">{rightSlot}</div>
        ) : null}

        <div className={cn("text-center", hasSides && "px-10")}>
          <h1
            className={cn(
              tabMain
                ? MOBILE_TAB_HEADER_TITLE_CLASS
                : "text-xl font-bold tracking-wide text-foreground",
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
