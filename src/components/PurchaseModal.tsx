import { useState } from "react";
import { Minus, Plus, Info, Tag, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TicketTier } from "@/hooks/useTicketTiers";
import { callEdgeFunction } from "@/infrastructure/api-client";

interface DiscountResult {
  valid: boolean;
  discount_type: string;
  discount_value: number;
  reveal_hidden_tickets?: boolean;
}

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventId?: string;
  ticketTiers: TicketTier[];
  loading?: boolean;
  onCheckout: (tierId: string, quantity: number, discountCode?: string) => void;
}

const SERVICE_FEE_RATE = 0.07; // 7% — must match orders-reserve

const PurchaseModal = ({
  open,
  onOpenChange,
  eventTitle,
  eventDate,
  eventLocation,
  eventId,
  ticketTiers,
  loading,
  onCheckout,
}: PurchaseModalProps) => {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);

  const selectedTicket = ticketTiers.find(t => t.id === selectedTier);
  const unitPriceRands = selectedTicket ? selectedTicket.priceCents / 100 : 0;
  const subtotal = unitPriceRands * quantity;

  // Apply discount
  let discountAmount = 0;
  if (discountResult?.valid) {
    if (discountResult.discount_type === 'percentage') {
      discountAmount = subtotal * (discountResult.discount_value / 100);
    } else {
      discountAmount = discountResult.discount_value / 100; // cents to rands
    }
  }
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const fees = discountedSubtotal * SERVICE_FEE_RATE;
  const total = discountedSubtotal + fees;

  const handleValidateCode = async () => {
    if (!discountCode.trim() || !eventId) return;
    setValidatingCode(true);
    setDiscountError("");
    setDiscountResult(null);
    try {
      const result = await callEdgeFunction<DiscountResult>('validate-discount', {
        body: { event_id: eventId, code: discountCode.trim() },
      });
      setDiscountResult(result);
    } catch (err: any) {
      setDiscountError(err?.message || "Invalid code");
    } finally {
      setValidatingCode(false);
    }
  };

  const handleCheckout = () => {
    if (selectedTier) {
      onCheckout(selectedTier, quantity, discountResult?.valid ? discountCode : undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-background">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-lg font-bold text-foreground">
            Get Tickets
          </DialogTitle>
        </DialogHeader>

        {/* Event Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground capitalize">{eventTitle}</h3>
              <p className="text-sm text-muted-foreground">{eventDate}</p>
              <p className="text-sm text-muted-foreground">{eventLocation}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => setShowCodeInput(!showCodeInput)}
            >
              <Tag className="h-4 w-4 mr-1" />
              Enter Code
            </Button>
          </div>

          {showCodeInput && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Discount code"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    setDiscountResult(null);
                    setDiscountError("");
                  }}
                  className="uppercase flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleValidateCode}
                  disabled={!discountCode.trim() || validatingCode}
                >
                  {validatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {discountResult?.valid && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {discountResult.discount_type === 'percentage'
                    ? `${discountResult.discount_value}% off applied`
                    : `R${(discountResult.discount_value / 100).toFixed(2)} off applied`}
                </p>
              )}
              {discountError && (
                <p className="text-xs text-destructive">{discountError}</p>
              )}
            </div>
          )}
        </div>

        {/* Ticket Tiers */}
        <div className="p-4 space-y-2 max-h-[200px] overflow-y-auto">
          {ticketTiers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No ticket tiers available</p>
          )}
          {ticketTiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                selectedTier === tier.id
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-card border-2 border-transparent hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{tier.name}</p>
                  {tier.availableQuantity !== null && (
                    <p className="text-xs text-muted-foreground">{tier.availableQuantity} remaining</p>
                  )}
                </div>
                <p className="font-bold text-foreground">
                  R{(tier.priceCents / 100).toFixed(2)}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Quantity & Checkout */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-foreground font-medium">Quantity</span>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold text-foreground">
                {quantity}
              </span>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(quantity + 1)}
                disabled={quantity >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
                    <p>Tickets: R{subtotal.toFixed(2)}</p>
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

export default PurchaseModal;
