import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  availableQuantity: number | null;
}

interface TicketTierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tier: TicketTier) => void;
  existing?: TicketTier | null;
}

const TicketTierModal = ({ open, onOpenChange, onSave, existing }: TicketTierModalProps) => {
  const [name, setName] = useState(existing?.name || "");
  const [price, setPrice] = useState(existing?.price?.toString() || "");
  const [quantity, setQuantity] = useState(existing?.availableQuantity?.toString() || "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: existing?.id || crypto.randomUUID(),
      name: name.trim(),
      price: parseFloat(price) || 0,
      availableQuantity: quantity ? parseInt(quantity) : null,
    });
    onOpenChange(false);
    setName("");
    setPrice("");
    setQuantity("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{existing ? "Edit Ticket Tier" : "Add Ticket Tier"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Name</Label>
            <Input placeholder="e.g. General Admission" value={name} onChange={(e) => setName(e.target.value)} className="bg-background border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Price (R)</Label>
            <Input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-background border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Available Quantity</Label>
            <Input type="number" placeholder="Unlimited" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="bg-background border-border" />
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketTierModal;
