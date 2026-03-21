import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface VipTableTier {
  id: string;
  name: string;
  description?: string | null;
  minSpend: number;
  availableQuantity: number;
  maxGuests: number;
  includedItems: string[];
}

interface VipTableTierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tier: VipTableTier) => void;
  existing?: VipTableTier | null;
}

const VipTableTierModal = ({ open, onOpenChange, onSave, existing }: VipTableTierModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [quantity, setQuantity] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [includedItems, setIncludedItems] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setName(existing?.name || "");
    setDescription(existing?.description || "");
    setMinSpend(existing?.minSpend?.toString() || "");
    setQuantity(existing?.availableQuantity?.toString() || "");
    setMaxGuests(existing?.maxGuests?.toString() || "");
    setIncludedItems(existing?.includedItems?.join(", ") || "");
  }, [existing, open]);

  const handleSave = () => {
    if (!name.trim()) {
      setNameError("Tier name is required");
      return;
    }

    const parsedMinSpend = parseFloat(minSpend) || 0;
    const parsedQuantity = Math.max(0, parseInt(quantity) || 0);
    const parsedMaxGuests = Math.max(1, parseInt(maxGuests) || 1);
    const parsedItems = includedItems
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    onSave({
      id: existing?.id || crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || null,
      minSpend: parsedMinSpend,
      availableQuantity: parsedQuantity,
      maxGuests: parsedMaxGuests,
      includedItems: parsedItems,
    });

    onOpenChange(false);
    setName("");
    setDescription("");
    setMinSpend("");
    setQuantity("");
    setMaxGuests("");
    setIncludedItems("");
    setNameError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{existing ? "Edit VIP Table Tier" : "Add VIP Table Tier"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Name</Label>
            <Input
              placeholder="e.g. Gold Table"
              value={name}
              onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }}
              className={`bg-background border-border ${nameError ? "border-destructive" : ""}`}
            />
            {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Description</Label>
            <Textarea
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background border-border"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-foreground">Minimum Spend (R)</Label>
              <Input type="number" placeholder="0" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Tables Available</Label>
              <Input type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="bg-background border-border" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Max Guests</Label>
            <Input type="number" placeholder="1" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} className="bg-background border-border" />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Included Items</Label>
            <Textarea
              placeholder="Bottle service, mixers, snacks"
              value={includedItems}
              onChange={(e) => setIncludedItems(e.target.value)}
              className="bg-background border-border"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Separate items with commas or new lines.</p>
          </div>

          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VipTableTierModal;
