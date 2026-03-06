import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface GuestlistPanelProps {
  guestlistEnabled: boolean;
  setGuestlistEnabled: (v: boolean) => void;
  guestlistDeadline: string;
  setGuestlistDeadline: (v: string) => void;
  requireApproval: boolean;
  setRequireApproval: (v: boolean) => void;
  guestlistCapacity: string;
  setGuestlistCapacity: (v: string) => void;
}

const GuestlistPanel = ({
  guestlistEnabled, setGuestlistEnabled,
  guestlistDeadline, setGuestlistDeadline,
  requireApproval, setRequireApproval,
  guestlistCapacity, setGuestlistCapacity,
}: GuestlistPanelProps) => {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-200">
      {/* Enable Guestlist */}
      <div className="flex items-center justify-between">
        <Label className="text-foreground">Enable Guestlist / VIPs</Label>
        <Switch checked={guestlistEnabled} onCheckedChange={setGuestlistEnabled} />
      </div>

      {guestlistEnabled && (
        <>
          {/* Deadline */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">Guestlist Deadline</Label>
            <Input type="datetime-local" value={guestlistDeadline} onChange={(e) => setGuestlistDeadline(e.target.value)} placeholder="None" className="bg-card border-border" />
            <p className="text-xs text-muted-foreground">Leave empty for no deadline</p>
          </div>

          {/* Require approval */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground text-sm">Require Approval</Label>
              <p className="text-xs text-muted-foreground">Guests must request access</p>
            </div>
            <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
          </div>

          {/* Max capacity */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">Max Guestlist Capacity</Label>
            <Input type="number" placeholder="None (unlimited)" value={guestlistCapacity} onChange={(e) => setGuestlistCapacity(e.target.value)} className="bg-card border-border" />
          </div>

          {/* Allow invite mutuals */}
          <div className="flex items-center justify-between opacity-60">
            <div className="flex items-center gap-2">
              <Label className="text-foreground text-sm">Allow Invite Mutuals</Label>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Coming Soon</Badge>
            </div>
            <Switch disabled checked={false} />
          </div>
        </>
      )}
    </div>
  );
};

export default GuestlistPanel;
