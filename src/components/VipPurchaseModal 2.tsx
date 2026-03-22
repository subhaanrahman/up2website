import { useEffect, useState } from "react";
import { Minus, Plus, Info, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { VipTableTier } from "@/hooks/useVipTableTiers";

interface VipPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  vipTiers: VipTableTier[];
  loading?: boolean;
  onCheckout: (tierId: string, guestCount: number, specialRequests?: string) => void;
}

const SERVICE_FEE_RATE = 0.07; // 7% — must match vip-reserve

const VipPurchaseModal = ({
  open,
  onOpenChange,
  eventTitle,
  eventDate,
  eventLocation,
  vipTiers,
  loading,
  onCheckout,
}: VipPurchaseModalProps) => {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");

  const tier = vipTiers.find((t) => t.id === selectedTier);
  const minSpendRands = tier ? tier.minSpendCents / 100 : 0;
  const fees = minSpendRands * SERVICE_FEE_RATE;
  const total = minSpendRands + fees;

  useEffect(() => {
    if (!tier) return;
    if (tier.soldOut || tier.availableRemaining <= 0) {
      setSelectedTier(null);
    }
  }, [tier, tier?.soldOut, tier?.availableRemaining]);

  const handleCheckout = () => {
    if (!tier) return;
    onCheckout(tier.id, guestCount, specialRequests.trim() || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-background">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-lg font-bold text-foreground">Reserve VIP Table</DialogTitle>
        </DialogHeader>

        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground capitalize">{eventTitle}</h3>
          <p className="text-sm text-muted-foreground">{eventDate}</p>
          <p className="text-sm text-muted-foreground">{eventLocation}</p>
        </div>

        <div className="p-4 space-y-2 max-h-[220px] overflow-y-auto">
          {vipTiers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No VIP tables available</p>
          )}
          {vipTiers.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.soldOut || t.availableRemaining <= 0) return;
                setSelectedTier(t.id);
                setGuestCount(1);
              }}
              disabled={t.soldOut || t.availableRemaining <= 0}
              className={`w-full p-4 rounded-tile-sm text-left transition-all ${
                selectedTier === t.id
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-card border-2 border-transparent hover:border-border"
              } ${t.soldOut || t.availableRemaining <= 0 ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    R{(t.minSpendCents / 100).toFixed(2)} min spend · {t.availableRemaining} left · {t.maxGuests} guests
                  </p>
                </div>
                {t.soldOut || t.availableRemaining <= 0 ? (
                  <span className="text-xs font-semibold uppercase tracking-wide text-destructive">Sold out</span>
                ) : (
                  <Check className={`h-4 w-4 ${selectedTier === t.id ? "text-primary" : "text-transparent"}`} />
                )}
              </div>
              {t.description && (
                <p className="text-xs text-muted-foreground mt-2">{t.description}</p>
              )}
              {t.includedItems?.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">Includes: {t.includedItems.join(", ")}</p>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground font-medium">Guests</span>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                disabled={guestCount <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold text-foreground">{guestCount}</span>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const maxGuests = tier?.maxGuests ?? 1;
                  setGuestCount(Math.min(maxGuests, guestCount + 1));
                }}
                disabled={tier ? guestCount >= tier.maxGuests : true}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Special requests (optional)</label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Allergies, celebration, or bottle preferences"
              className="bg-background border-border"
              rows={3}
            />
          </div>

          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!selectedTier || loading}
            onClick={handleCheckout}
          >
            {loading ? "Reserving..." : `CHECKOUT – R${total.toFixed(2)}`}
            {!loading && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 ml-2 opacity-70" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p>Minimum Spend: R{minSpendRands.toFixed(2)}</p>
                    <p>Service Fee: R{fees.toFixed(2)}</p>
                    <p className="font-semibold">Total: R{total.toFixed(2)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VipPurchaseModal;
