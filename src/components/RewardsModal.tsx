import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";

interface RewardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  points: number;
  maxPoints: number;
}

const RewardsModal = ({ open, onOpenChange, points, maxPoints }: RewardsModalProps) => {
  const progress = (points / maxPoints) * 100;
  const size = 200;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-none p-0 max-w-md w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-xl flex flex-col">
        {/* Header */}
        <div className="pt-8 pb-4">
          <h2 className="text-xl font-bold text-foreground text-center tracking-wide">
            REWARDS
          </h2>
        </div>

        {/* Points Ring */}
        <div className="flex-1 flex flex-col items-center justify-start pt-8">
          <div className="relative" style={{ width: size, height: size }}>
            {/* Background circle (track) */}
            <svg
              className="absolute inset-0 -rotate-90"
              width={size}
              height={size}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={strokeWidth}
              />
              {/* Progress circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Points text centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-foreground">
                {points.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground tracking-widest">
                POINTS
              </span>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="p-6">
          <button
            onClick={() => onOpenChange(false)}
            className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RewardsModal;
