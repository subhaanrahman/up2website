import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

interface PointsAnimationProps {
  points: number;
  show: boolean;
  onComplete: () => void;
}

const PointsAnimation = ({ points, show, onComplete }: PointsAnimationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && points >= 50) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, points, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <div className="animate-scale-in">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150" />
          
          {/* Main content */}
          <div className="relative bg-card/95 backdrop-blur-sm border border-primary/50 rounded-tile px-8 py-6 shadow-2xl">
            <div className="flex flex-col items-center gap-3">
              {/* Icon with pulse */}
              <div className="relative">
                <div className="absolute inset-0 bg-primary/50 rounded-full animate-ping" />
                <div className="relative bg-primary rounded-full p-3">
                  <Zap className="h-8 w-8 text-primary-foreground fill-current" />
                </div>
              </div>
              
              {/* Points text */}
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">+{points}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">
                  Points Earned!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsAnimation;
