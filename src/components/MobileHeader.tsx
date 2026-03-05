import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  backTo?: string;
  rightAction?: ReactNode;
  className?: string;
}

const MobileHeader = ({ 
  title, 
  showBack = false, 
  backTo = "/",
  rightAction,
  className 
}: MobileHeaderProps) => {
  return (
    <header className={cn(
      "sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border md:hidden",
      className
    )}>
      <div className="flex items-center justify-between px-4 h-14">
        {showBack ? (
          <Link to={backTo}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        ) : (
          <div className="w-9" />
        )}
        
        <h1 className="text-base font-bold tracking-wide uppercase text-foreground absolute left-1/2 -translate-x-1/2">
          {title}
        </h1>
        
        {rightAction || <div className="w-9" />}
      </div>
    </header>
  );
};

export default MobileHeader;
