import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BellOff, Bell, UserMinus } from "lucide-react";
import { connectionsRepository } from "@/features/social/repositories/connectionsRepository";
import { toast } from "sonner";

interface FriendOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  /** For personal friend connections */
  connectionId?: string;
  isMuted?: boolean;
  onMuteToggled?: (muted: boolean) => void;
  onUnfriended?: () => void;
  /** For organiser follows */
  organiserProfileId?: string;
  isOrganiserMuted?: boolean;
  onOrganiserMuteToggled?: (muted: boolean) => void;
  onUnfollowed?: () => void;
  userId: string; // current user id
}

export default function FriendOptionsSheet({
  open,
  onOpenChange,
  displayName,
  connectionId,
  isMuted = false,
  onMuteToggled,
  onUnfriended,
  organiserProfileId,
  isOrganiserMuted = false,
  onOrganiserMuteToggled,
  onUnfollowed,
  userId,
}: FriendOptionsSheetProps) {
  const handleMuteConnection = async () => {
    if (!connectionId) return;
    const newMuted = !isMuted;
    try {
      await connectionsRepository.updateMuted(connectionId, newMuted);
      onMuteToggled?.(newMuted);
      toast(newMuted ? `Muted ${displayName}` : `Unmuted ${displayName}`);
    } catch {
      toast.error("Failed to update mute");
    }
    onOpenChange(false);
  };

  const handleMuteOrganiser = async () => {
    if (!organiserProfileId) return;
    const newMuted = !isOrganiserMuted;
    try {
      await connectionsRepository.updateOrganiserMuted(organiserProfileId, userId, newMuted);
      onOrganiserMuteToggled?.(newMuted);
      toast(newMuted ? `Muted ${displayName}` : `Unmuted ${displayName}`);
    } catch {
      toast.error("Failed to update mute");
    }
    onOpenChange(false);
  };

  const handleUnfriend = async () => {
    if (!connectionId) return;
    try {
      await connectionsRepository.deleteById(connectionId);
      onUnfriended?.();
      toast(`Removed ${displayName} as friend`);
    } catch {
      toast.error("Failed to remove friend");
    }
    onOpenChange(false);
  };

  const handleUnfollow = async () => {
    if (!organiserProfileId) return;
    try {
      await connectionsRepository.unfollowOrganiser(organiserProfileId, userId);
      onUnfollowed?.();
      toast(`Unfollowed ${displayName}`);
    } catch {
      toast.error("Failed to unfollow");
    }
    onOpenChange(false);
  };

  const isOrganiserMode = !!organiserProfileId;
  const currentMuted = isOrganiserMode ? isOrganiserMuted : isMuted;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-center text-foreground">{displayName}</SheetTitle>
        </SheetHeader>

        <div className="space-y-1">
          {/* Mute */}
          <button
            onClick={isOrganiserMode ? handleMuteOrganiser : handleMuteConnection}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-secondary/50 rounded-lg transition-colors"
          >
            <span className="text-foreground font-medium">
              {currentMuted ? "Unmute" : "Mute"}
            </span>
            {currentMuted ? (
              <Bell className="h-5 w-5 text-muted-foreground" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          <div className="h-px bg-border" />

          {/* Remove / Unfollow */}
          <button
            onClick={isOrganiserMode ? handleUnfollow : handleUnfriend}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-secondary/50 rounded-lg transition-colors"
          >
            <span className="text-destructive font-medium">
              {isOrganiserMode ? "Unfollow" : "Remove Friend"}
            </span>
            <UserMinus className="h-5 w-5 text-destructive" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
