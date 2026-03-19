import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Zap, Ticket, Crown, Shield, Star, Gem } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import {
  UserRank,
  RANK_LABELS,
  RANK_COLORS,
  RANK_ORDER,
  RANK_THRESHOLDS,
  POINT_VALUES,
  ACTION_LABELS,
  getProgressToNextRank,
  getPointsToNextRank,
  getNextRank,
} from "@/lib/gamification";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RewardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RANK_ICONS: Record<UserRank, React.ReactNode> = {
  bronze: <Shield className="h-5 w-5" />,
  silver: <Star className="h-5 w-5" />,
  gold: <Crown className="h-5 w-5" />,
  platinum: <Gem className="h-5 w-5" />,
  diamond: <Gem className="h-5 w-5" />,
};

const RewardsModal = ({ open, onOpenChange }: RewardsModalProps) => {
  const { points, rank, vouchers, loading } = useGamification();
  
  const progress = getProgressToNextRank(points, rank);
  const pointsToNext = getPointsToNextRank(points, rank);
  const nextRank = getNextRank(rank);
  
  const size = 180;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const availableVouchers = vouchers.filter((v) => v.status === "available");
  const usedVouchers = vouchers.filter((v) => v.status === "used");

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-background border-none p-0 max-w-md w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-tile-sm flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-none p-0 max-w-md w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-tile-sm flex flex-col">
        {/* Header */}
        <div className="pt-6 pb-2 px-6">
          <h2 className="text-xl font-bold text-foreground text-center tracking-wide">
            REWARDS
          </h2>
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="pb-6">
            {/* Points Ring */}
            <div className="flex flex-col items-center py-6">
              <div className="relative" style={{ width: size, height: size }}>
                <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth={strokeWidth}
                  />
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
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-foreground">
                    {points.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground tracking-widest">POINTS</span>
                </div>
              </div>

              {nextRank && (
                <p className="text-sm text-muted-foreground mt-3">
                  {pointsToNext.toLocaleString()} points to {RANK_LABELS[nextRank]}
                </p>
              )}
            </div>

            {/* Current Rank */}
            <div className="bg-card rounded-tile-sm p-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: RANK_COLORS[rank] + "33", color: RANK_COLORS[rank] }}
                >
                  {RANK_ICONS[rank]}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Rank</p>
                  <p className="text-xl font-bold text-foreground">{RANK_LABELS[rank]}</p>
                </div>
              </div>
            </div>

            {/* Rank Progression */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Rank Progression
              </h3>
              <div className="bg-card rounded-tile-sm p-4 space-y-2">
                {RANK_ORDER.map((r) => {
                  const isActive = r === rank;
                  const isUnlocked = RANK_ORDER.indexOf(r) <= RANK_ORDER.indexOf(rank);
                  return (
                    <div
                      key={r}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        isActive ? "bg-primary/10 border border-primary/30" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            isUnlocked ? "" : "opacity-40"
                          }`}
                          style={{
                            backgroundColor: RANK_COLORS[r] + "33",
                            color: RANK_COLORS[r],
                          }}
                        >
                          {RANK_ICONS[r]}
                        </div>
                        <span className={`font-medium ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                          {RANK_LABELS[r]}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {RANK_THRESHOLDS[r].toLocaleString()} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vouchers */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                Coupons & Rewards
              </h3>
              <div className="bg-card rounded-tile-sm p-4">
                {availableVouchers.length === 0 && usedVouchers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Level up to earn $5 ticket vouchers!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availableVouchers.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg"
                      >
                        <div>
                          <p className="font-mono text-sm font-bold text-foreground">{v.code}</p>
                          <p className="text-xs text-muted-foreground">
                            Earned at {RANK_LABELS[v.earnedAtRank]}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">${(v.valueCents / 100).toFixed(2)}</p>
                          <p className="text-xs text-green-500">Available</p>
                        </div>
                      </div>
                    ))}
                    {usedVouchers.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg opacity-60"
                      >
                        <div>
                          <p className="font-mono text-sm text-muted-foreground line-through">{v.code}</p>
                          <p className="text-xs text-muted-foreground">Used</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">${(v.valueCents / 100).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Redeemed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* How to Earn Points */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Earn Points
              </h3>
              <div className="bg-card rounded-tile-sm p-4 space-y-2">
                {Object.entries(POINT_VALUES).map(([action, pts]) => (
                  <div key={action} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">
                      {ACTION_LABELS[action as keyof typeof ACTION_LABELS]}
                    </span>
                    <span className="text-sm font-semibold text-primary">+{pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Back button */}
        <div className="p-6 pt-2">
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
