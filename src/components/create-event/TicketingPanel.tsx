import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TicketTierModal, { type TicketTier } from "./TicketTierModal";
import VipTableTierModal, { type VipTableTier } from "./VipTableTierModal";
import DiscountCodeModal, { type DiscountCode } from "./DiscountCodeModal";
import { DateTimePicker } from "./DateTimePicker";

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
  vipTableTiers: VipTableTier[];
  setVipTableTiers: (v: VipTableTier[]) => void;
  ticketsAvailableFrom: string;
  setTicketsAvailableFrom: (v: string) => void;
  soldOutMessageEnabled: boolean;
  setSoldOutMessageEnabled: (v: boolean) => void;
  soldOutMessage: string;
  setSoldOutMessage: (v: string) => void;
  vipTablesEnabled: boolean;
  setVipTablesEnabled: (v: boolean) => void;
  refundsEnabled: boolean;
  setRefundsEnabled: (v: boolean) => void;
  refundDeadlineHours: string;
  setRefundDeadlineHours: (v: string) => void;
  refundPolicyText: string;
  setRefundPolicyText: (v: string) => void;
  payoutsReady?: boolean;
  organiserProfileId?: string;
  onStartOnboarding?: () => void;
}

const TicketingPanel = ({
  capacity, setCapacity,
  showRemaining, setShowRemaining,
  discountsEnabled, setDiscountsEnabled,
  discountCodes, setDiscountCodes,
  ticketTiers, setTicketTiers,
  vipTableTiers, setVipTableTiers,
  ticketsAvailableFrom, setTicketsAvailableFrom,
  soldOutMessageEnabled, setSoldOutMessageEnabled,
  soldOutMessage, setSoldOutMessage,
  vipTablesEnabled, setVipTablesEnabled,
  refundsEnabled, setRefundsEnabled,
  refundDeadlineHours, setRefundDeadlineHours,
  refundPolicyText, setRefundPolicyText,
  payoutsReady = false,
  organiserProfileId,
  onStartOnboarding,
}: TicketingPanelProps) => {
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [vipTierModalOpen, setVipTierModalOpen] = useState(false);
  const [editingVipTier, setEditingVipTier] = useState<VipTableTier | null>(null);

  const wantsPaidOrVipSales =
    vipTablesEnabled || ticketTiers.some((t) => t.price > 0);
  /** Paid checkout needs Connect; free tiers / guest-style caps do not. */
  const hasPaidTicketTier = ticketTiers.some((t) => t.price > 0);

  const handleSaveTier = (tier: TicketTier) => {
    setTicketTiers(ticketTiers.some((t) => t.id === tier.id)
      ? ticketTiers.map((t) => (t.id === tier.id ? tier : t))
      : [...ticketTiers, tier]);
    setEditingTier(null);
  };

  const handleSaveDiscount = (discount: DiscountCode) => {
    setDiscountCodes(discountCodes.some((d) => d.id === discount.id)
      ? discountCodes.map((d) => (d.id === discount.id ? discount : d))
      : [...discountCodes, discount]);
    setEditingDiscount(null);
  };

  const handleSaveVipTier = (tier: VipTableTier) => {
    setVipTableTiers(vipTableTiers.some((t) => t.id === tier.id)
      ? vipTableTiers.map((t) => (t.id === tier.id ? tier : t))
      : [...vipTableTiers, tier]);
    setEditingVipTier(null);
  };

  return (
    <div className="space-y-3 animate-in fade-in-0 duration-200">

      {!payoutsReady && wantsPaidOrVipSales && (
        <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10 rounded-tile">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Set up payouts in your organiser profile before selling paid tickets or VIP tables.
          </AlertDescription>
          {organiserProfileId && onStartOnboarding && (
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={onStartOnboarding}
            >
              Set up payouts
            </Button>
          )}
        </Alert>
      )}

      {/* Capacity */}
      <div className="bg-card rounded-tile border border-border/50 px-4 pt-4 pb-4">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Capacity</p>
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Unlimited"
          className="w-full bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none"
        />
      </div>

      {/* Toggles */}
      <div className="bg-card rounded-tile border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <p className="text-[15px] font-medium text-foreground">Show tickets remaining</p>
          <Switch checked={showRemaining} onCheckedChange={setShowRemaining} />
        </div>
        <div className="h-px bg-border/50 mx-4" />
        <div className="flex items-center justify-between px-4 py-4">
          <p className="text-[15px] font-medium text-foreground">Custom sold-out message</p>
          <Switch checked={soldOutMessageEnabled} onCheckedChange={setSoldOutMessageEnabled} />
        </div>
        {organiserProfileId ? (
          <>
            <div className="h-px bg-border/50 mx-4" />
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-[15px] font-medium text-foreground">Enable VIP tables</p>
                <p className="text-xs text-muted-foreground">Allow table reservations with minimum spend</p>
              </div>
              <Switch checked={vipTablesEnabled} onCheckedChange={setVipTablesEnabled} disabled={!payoutsReady} />
            </div>
            <div className="h-px bg-border/50 mx-4" />
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-[15px] font-medium text-foreground">Allow ticket refunds</p>
                <p className="text-xs text-muted-foreground">Buyers can request a refund before the event</p>
              </div>
              <Switch
                checked={refundsEnabled}
                onCheckedChange={setRefundsEnabled}
                disabled={!payoutsReady}
              />
            </div>
            {refundsEnabled && (
              <>
                <div className="h-px bg-border/50 mx-4" />
                <div className="px-4 py-3 space-y-2">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                    Refund cutoff (hours before start)
                  </p>
                  <p className="text-xs text-muted-foreground">Leave empty to allow until the event starts</p>
                  <input
                    type="number"
                    min={0}
                    max={168}
                    value={refundDeadlineHours}
                    onChange={(e) => setRefundDeadlineHours(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none"
                  />
                </div>
                <div className="h-px bg-border/50 mx-4" />
                <div className="px-4 pt-3 pb-4">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-2">
                    Refund note (optional)
                  </p>
                  <textarea
                    value={refundPolicyText}
                    onChange={(e) => setRefundPolicyText(e.target.value)}
                    placeholder="Shown on the event page — e.g. full refund up to 48h before doors."
                    rows={2}
                    maxLength={2000}
                    className="w-full bg-transparent text-foreground text-[15px] placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
                  />
                </div>
              </>
            )}
          </>
        ) : null}
        {soldOutMessageEnabled && (
          <>
            <div className="h-px bg-border/50 mx-4" />
            <div className="px-4 pt-3 pb-4">
              <textarea
                value={soldOutMessage}
                onChange={(e) => setSoldOutMessage(e.target.value)}
                placeholder="e.g. All tickets have been claimed! Follow us for future events."
                rows={2}
                className="w-full bg-transparent text-foreground text-[15px] placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
              />
            </div>
          </>
        )}
      </div>

      {/* Ticket Tiers */}
      <div className="bg-card rounded-tile border border-border/50 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Ticket Tiers</p>
        </div>
        {ticketTiers.map((tier, i) => (
          <div key={tier.id}>
            {i !== 0 && <div className="h-px bg-border/50 mx-4" />}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[15px] font-medium text-foreground">{tier.name}</p>
                <p className="text-xs text-muted-foreground">
                  R{tier.price}{tier.availableQuantity ? ` · ${tier.availableQuantity} qty` : ""}
                </p>
              </div>
              <button onClick={() => { setEditingTier(tier); setTierModalOpen(true); }} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        ))}
        <div className={ticketTiers.length > 0 ? "h-px bg-border/50 mx-4" : ""} />
        <button
          onClick={() => { setEditingTier(null); setTierModalOpen(true); }}
          disabled={!payoutsReady && hasPaidTicketTier}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-primary text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" /> Add Ticket Tier
        </button>
      </div>

      {vipTablesEnabled ? (
        <div className="bg-card rounded-tile border border-border/50 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">VIP Tables</p>
          </div>
          {vipTableTiers.map((tier, i) => (
            <div key={tier.id}>
              {i !== 0 && <div className="h-px bg-border/50 mx-4" />}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[15px] font-medium text-foreground">{tier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    R{tier.minSpend} · {tier.availableQuantity} tables · {tier.maxGuests} guests
                  </p>
                </div>
                <button onClick={() => { setEditingVipTier(tier); setVipTierModalOpen(true); }} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
          <div className={vipTableTiers.length > 0 ? "h-px bg-border/50 mx-4" : ""} />
          <button
            onClick={() => { setEditingVipTier(null); setVipTierModalOpen(true); }}
            disabled={!payoutsReady}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-primary text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" /> Add VIP Table Tier
          </button>
        </div>
      ) : null}

      {/* Discount Codes */}
      <div className="bg-card rounded-tile border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <p className="text-[15px] font-medium text-foreground">Discount Codes</p>
          <Switch checked={discountsEnabled} onCheckedChange={setDiscountsEnabled} />
        </div>
        {discountsEnabled && (
          <>
            {discountCodes.map((dc, i) => (
              <div key={dc.id}>
                <div className="h-px bg-border/50 mx-4" />
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[15px] font-medium text-foreground">{dc.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {dc.discountType === "percentage" ? `${dc.discountValue}% off` : `R${dc.discountValue} off`}
                    </p>
                  </div>
                  <button onClick={() => { setEditingDiscount(dc); setDiscountModalOpen(true); }} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
            <div className="h-px bg-border/50 mx-4" />
            <button
              onClick={() => { setEditingDiscount(null); setDiscountModalOpen(true); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-primary text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Add Discount Code
            </button>
          </>
        )}
      </div>

      {/* Tickets available from */}
      <DateTimePicker
        value={ticketsAvailableFrom}
        onChange={setTicketsAvailableFrom}
        label="Tickets Available From"
        helperText="Leave empty to open immediately"
      />

      <TicketTierModal
        open={tierModalOpen}
        onOpenChange={setTierModalOpen}
        onSave={handleSaveTier}
        existing={editingTier}
        payoutsReady={payoutsReady}
      />
      <DiscountCodeModal open={discountModalOpen} onOpenChange={setDiscountModalOpen} onSave={handleSaveDiscount} existing={editingDiscount} />
      <VipTableTierModal open={vipTierModalOpen} onOpenChange={setVipTierModalOpen} onSave={handleSaveVipTier} existing={editingVipTier} />
    </div>
  );
};

export default TicketingPanel;
