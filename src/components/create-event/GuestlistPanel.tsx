import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "./DateTimePicker";

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
    <div className="space-y-3 animate-in fade-in-0 duration-200">

      {/* Enable toggle */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-[15px] font-medium text-foreground">Enable Guestlist / VIPs</p>
            <p className="text-xs text-muted-foreground mt-0.5">Allow guests to join the guestlist</p>
          </div>
          <Switch checked={guestlistEnabled} onCheckedChange={setGuestlistEnabled} />
        </div>
      </div>

      {guestlistEnabled && (
        <>
          {/* Deadline */}
          <DateTimePicker
            value={guestlistDeadline}
            onChange={setGuestlistDeadline}
            label="Guestlist Deadline"
            helperText="Leave empty for no deadline"
          />

          {/* Capacity */}
          <div className="bg-card rounded-2xl border border-border/50 px-4 pt-4 pb-4">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Max Guestlist Capacity</p>
            <input
              type="number"
              value={guestlistCapacity}
              onChange={(e) => setGuestlistCapacity(e.target.value)}
              placeholder="Unlimited"
              className="w-full bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none"
            />
          </div>

          {/* Require approval + Coming Soon */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-[15px] font-medium text-foreground">Require Approval</p>
                <p className="text-xs text-muted-foreground mt-0.5">Guests must request access</p>
              </div>
              <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
            </div>
            <div className="h-px bg-border/50 mx-4" />
            <div className="flex items-center justify-between px-4 py-4 opacity-50">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-medium text-foreground">Allow Invite Mutuals</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
              </div>
              <Switch disabled checked={false} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GuestlistPanel;
