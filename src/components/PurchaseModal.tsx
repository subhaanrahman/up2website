import { useState } from "react";
import { X, Minus, Plus, Info, Tag } from "lucide-react";
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

interface TicketTier {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  ticketTiers: TicketTier[];
  onCheckout: (tierId: string, quantity: number, discountCode?: string) => void;
}

const PurchaseModal = ({
  open,
  onOpenChange,
  eventTitle,
  eventDate,
  eventLocation,
  ticketTiers,
  onCheckout,
}: PurchaseModalProps) => {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  const selectedTicket = ticketTiers.find(t => t.id === selectedTier);
  const subtotal = selectedTicket ? selectedTicket.price * quantity : 0;
  const fees = subtotal * 0.1; // 10% service fee
  const total = subtotal + fees;

  const handleCheckout = () => {
    if (selectedTier) {
      onCheckout(selectedTier, quantity, discountCode || undefined);
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
              <h3 className="font-semibold text-foreground">{eventTitle}</h3>
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
            <div className="mt-3">
              <Input
                placeholder="Discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="uppercase"
              />
            </div>
          )}
        </div>

        {/* Ticket Tiers */}
        <div className="p-4 space-y-2 max-h-[200px] overflow-y-auto">
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
                  {tier.description && (
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  )}
                </div>
                <p className="font-bold text-foreground">
                  ${tier.price.toFixed(2)}
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
            disabled={!selectedTier}
            onClick={handleCheckout}
          >
            CHECKOUT – ${total.toFixed(2)}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 opacity-70" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p>Tickets: ${subtotal.toFixed(2)}</p>
                  <p>Service Fee: ${fees.toFixed(2)}</p>
                  <p className="font-semibold">Total: ${total.toFixed(2)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseModal;
