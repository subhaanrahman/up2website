import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  className?: string;
  dense?: boolean;
}

const AppHeader = ({
  title,
  subtitle,
  onBack,
  rightSlot,
  className,
  dense = false,
}: AppHeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md",
        className,
      )}
    >
      <div className={cn("relative px-4", dense ? "py-2.5" : "py-3.5")}>
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : null}

        {rightSlot ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        ) : null}

        <div className="text-center px-10">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
