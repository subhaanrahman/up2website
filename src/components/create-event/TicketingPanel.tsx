import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Info, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TicketTierModal, { type TicketTier } from "./TicketTierModal";
import DiscountCodeModal, { type DiscountCode } from "./DiscountCodeModal";

interface TicketingPanelProps {
  capacity: string;
  setCapacity: (v: string) => void;
  showRemaining: boolean;
  setShowRemaining: (v: boolean) => void;
  discountsEnabled: boolean;
  setDiscountsEnabled: (v: boolean) => void;
  discountCodes: DiscountCode[];
  setDiscountCodes: (v: DiscountCode[]) => void;
  ticketTiers: TicketTier[];
  setTicketTiers: (v: TicketTier[]) => void;
  ticketsAvailableFrom: string;
  setTicketsAvailableFrom: (v: string) => void;
  soldOutMessageEnabled: boolean;
  setSoldOutMessageEnabled: (v: boolean) => void;
  soldOutMessage: string;
  setSoldOutMessage: (v: string) => void;
  payoutsReady?: boolean;
}

const TicketingPanel = ({
  capacity, setCapacity,
  showRemaining, setShowRemaining,
  discountsEnabled, setDiscountsEnabled,
  discountCodes, setDiscountCodes,
  ticketTiers, setTicketTiers,
  ticketsAvailableFrom, setTicketsAvailableFrom,
  soldOutMessageEnabled, setSoldOutMessageEnabled,
  soldOutMessage, setSoldOutMessage,
  payoutsReady = false,
}: TicketingPanelProps) => {
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);

  const handleSaveTier = (tier: TicketTier) => {
    setTicketTiers(
      ticketTiers.some((t) => t.id === tier.id)
        ? ticketTiers.map((t) => (t.id === tier.id ? tier : t))
        : [...ticketTiers, tier]
    );
    setEditingTier(null);
  };

  const handleSaveDiscount = (discount: DiscountCode) => {
    setDiscountCodes(
      discountCodes.some((d) => d.id === discount.id)
        ? discountCodes.map((d) => (d.id === discount.id ? discount : d))
        : [...discountCodes, discount]
    );
    setEditingDiscount(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-200">
      {/* Payout setup warning */}
      {!payoutsReady && (
        <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Set up payouts in your organiser profile settings before creating paid ticket tiers.
          </AlertDescription>
        </Alert>
      )}
      {/* Capacity */}
      <div className="space-y-2">
        <Label className="text-foreground">Capacity</Label>
        <Input type="number" placeholder="Unlimited" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="bg-card border-border" />
      </div>

      {/* Show remaining toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-foreground text-sm">Show tickets remaining / sold</Label>
        <Switch checked={showRemaining} onCheckedChange={setShowRemaining} />
      </div>

      {/* Discount codes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-foreground text-sm">Discount Codes</Label>
          <Switch checked={discountsEnabled} onCheckedChange={setDiscountsEnabled} />
        </div>
        {discountsEnabled && (
          <div className="space-y-2">
            {discountCodes.map((dc) => (
              <div key={dc.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                <div>
                  <span className="text-foreground font-medium text-sm">{dc.code}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {dc.discountType === "percentage" ? `${dc.discountValue}%` : `R${dc.discountValue}`}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setEditingDiscount(dc); setDiscountModalOpen(true); }}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => { setEditingDiscount(null); setDiscountModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Discount
            </Button>
          </div>
        )}
      </div>

      {/* Ticket tiers */}
      <div className="space-y-3">
        <Label className="text-foreground text-sm">Ticket Tiers</Label>
        {ticketTiers.map((tier) => (
          <div key={tier.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
            <div>
              <span className="text-foreground font-medium text-sm">{tier.name}</span>
              <span className="text-muted-foreground text-xs ml-2">R{tier.price}</span>
              {tier.availableQuantity && <span className="text-muted-foreground text-xs ml-1">· {tier.availableQuantity} qty</span>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setEditingTier(tier); setTierModalOpen(true); }}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => { setEditingTier(null); setTierModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Ticket Tier
        </Button>
      </div>

      {/* Tickets available from */}
      <div className="space-y-2">
        <Label className="text-foreground text-sm flex items-center gap-1">
          Tickets available from
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-popover border-border text-popover-foreground">
              <p className="text-xs">Default: immediately upon event creation</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <Input type="datetime-local" value={ticketsAvailableFrom} onChange={(e) => setTicketsAvailableFrom(e.target.value)} className="bg-card border-border" />
      </div>

      {/* Custom sold out message */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-foreground text-sm">Custom sold out message</Label>
          <Switch checked={soldOutMessageEnabled} onCheckedChange={setSoldOutMessageEnabled} />
        </div>
        {soldOutMessageEnabled && (
          <Textarea placeholder="e.g. All tickets have been claimed! Follow us for future events." value={soldOutMessage} onChange={(e) => setSoldOutMessage(e.target.value)} className="bg-card border-border" rows={2} />
        )}
      </div>

      <TicketTierModal open={tierModalOpen} onOpenChange={setTierModalOpen} onSave={handleSaveTier} existing={editingTier} />
      <DiscountCodeModal open={discountModalOpen} onOpenChange={setDiscountModalOpen} onSave={handleSaveDiscount} existing={editingDiscount} />
    </div>
  );
};

export default TicketingPanel;
