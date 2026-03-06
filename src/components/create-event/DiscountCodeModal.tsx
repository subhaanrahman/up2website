import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DiscountCode {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  ticketLimitType: "unlimited" | "limited";
  ticketLimitAmount: number | null;
  revealHiddenTickets: boolean;
}

interface DiscountCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (discount: DiscountCode) => void;
  existing?: DiscountCode | null;
}

const DiscountCodeModal = ({ open, onOpenChange, onSave, existing }: DiscountCodeModalProps) => {
  const [code, setCode] = useState(existing?.code || "");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(existing?.discountType || "percentage");
  const [discountValue, setDiscountValue] = useState(existing?.discountValue?.toString() || "");
  const [ticketLimitType, setTicketLimitType] = useState<"unlimited" | "limited">(existing?.ticketLimitType || "unlimited");
  const [ticketLimitAmount, setTicketLimitAmount] = useState(existing?.ticketLimitAmount?.toString() || "");
  const [revealHidden, setRevealHidden] = useState(existing?.revealHiddenTickets || false);

  const handleSave = () => {
    if (!code.trim()) return;
    onSave({
      id: existing?.id || crypto.randomUUID(),
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      ticketLimitType,
      ticketLimitAmount: ticketLimitType === "limited" ? parseInt(ticketLimitAmount) || null : null,
      revealHiddenTickets: revealHidden,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{existing ? "Edit Discount" : "Add Discount Code"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Code</Label>
            <Input placeholder="e.g. EARLY20" value={code} onChange={(e) => setCode(e.target.value)} className="bg-background border-border uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-foreground">Type</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="percentage">Percentage %</SelectItem>
                  <SelectItem value="fixed">Fixed R</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Amount</Label>
              <Input type="number" placeholder="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="bg-background border-border" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Ticket Limit</Label>
            <Select value={ticketLimitType} onValueChange={(v) => setTicketLimitType(v as "unlimited" | "limited")}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="unlimited">Unlimited</SelectItem>
                <SelectItem value="limited">Limited to...</SelectItem>
              </SelectContent>
            </Select>
            {ticketLimitType === "limited" && (
              <Input type="number" placeholder="Enter limit" value={ticketLimitAmount} onChange={(e) => setTicketLimitAmount(e.target.value)} className="bg-background border-border mt-2" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-foreground text-sm">Reveal hidden tickets at checkout</Label>
            <Switch checked={revealHidden} onCheckedChange={setRevealHidden} />
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscountCodeModal;
