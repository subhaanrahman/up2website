import { useState } from "react";
import { CalendarPlus, MessageSquare, Share2, CheckCircle2 } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InviteFriend {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface RsvpConfirmationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  onAddToCalendar: () => void;
  onInviteFriends: () => void;
  onMessageHost: () => void;
  inviteFriends?: InviteFriend[];
  onInviteFriend?: (friendId: string) => void;
  invitingFriendId?: string | null;
  onShareLink?: () => void;
}

const RsvpConfirmationSheet = ({
  open,
  onOpenChange,
  eventTitle,
  onAddToCalendar,
  onInviteFriends,
  onMessageHost,
  inviteFriends = [],
  onInviteFriend,
  invitingFriendId,
  onShareLink,
}: RsvpConfirmationSheetProps) => {
  const [showInvitePicker, setShowInvitePicker] = useState(false);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-6">
        <div className="px-4 pt-2">
          <div className="flex flex-col items-center text-center py-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">You're in</h3>
            <p className="text-sm text-muted-foreground mt-1">
              RSVP confirmed for <span className="text-foreground font-medium">{eventTitle}</span>
            </p>
          </div>

          <div className="space-y-2 mt-2">
            <Button
              variant="secondary"
              className="w-full justify-start gap-2 h-11"
              onClick={onAddToCalendar}
            >
              <CalendarPlus className="h-4 w-4" />
              Add to Calendar
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start gap-2 h-11"
              onClick={() => {
                setShowInvitePicker((v) => !v);
                onInviteFriends();
              }}
            >
              <Share2 className="h-4 w-4" />
              {showInvitePicker ? "Hide Invites" : "Invite Friends"}
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start gap-2 h-11"
              onClick={onMessageHost}
            >
              <MessageSquare className="h-4 w-4" />
              Message Host
            </Button>
          </div>

          {showInvitePicker && (
            <div className="mt-3 rounded-tile-sm border border-border bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Invite Friends
              </p>
              {inviteFriends.length === 0 ? (
                <p className="text-sm text-muted-foreground">No friends to invite yet.</p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {inviteFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {(friend.displayName || "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm text-foreground flex-1 truncate">{friend.displayName}</p>
                      <Button
                        size="sm"
                        className="h-8 rounded-full px-3 text-xs"
                        onClick={() => onInviteFriend?.(friend.id)}
                        disabled={invitingFriendId === friend.id}
                      >
                        {invitingFriendId === friend.id ? "Sending..." : "Invite"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {onShareLink && (
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs mt-2"
                  onClick={onShareLink}
                >
                  Share link instead
                </Button>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default RsvpConfirmationSheet;
