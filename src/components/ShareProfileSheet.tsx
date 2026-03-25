import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Send, Copy, MessageCircle, Share2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/infrastructure/supabase';
import { connectionsParticipantOr } from '@/utils/postgrest-connection-filters';
import { useQuery } from "@tanstack/react-query";

interface ShareProfileSheetProps {
  profileUrl: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface FriendProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

const ShareProfileSheet = ({ profileUrl, displayName, avatarUrl }: ShareProfileSheetProps) => {
  const [open, setOpen] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const fullUrl = `${window.location.origin}${profileUrl}`;

  // Fetch accepted friends
  const { data: friends = [] } = useQuery<FriendProfile[]>({
    queryKey: ["share-friends", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: connections } = await supabase
        .from("connections")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(connectionsParticipantOr(user.id));

      if (!connections?.length) return [];

      const friendIds = connections.map((c) =>
        c.requester_id === user.id ? c.addressee_id : c.requester_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", friendIds);

      return (profiles as FriendProfile[]) || [];
    },
    enabled: !!user && open,
  });

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied!");
    setOpen(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `${displayName}'s profile`, url: fullUrl });
      setOpen(false);
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${displayName}'s profile: ${fullUrl}`)}`, "_blank");
    setOpen(false);
  };

  const handleShareToFriend = async (friend: FriendProfile) => {
    if (!user || sentTo.has(friend.user_id)) return;
    try {
      await supabase.functions.invoke("notifications-send", {
        body: {
          type: "shared_account",
          recipient_user_id: friend.user_id,
          title: "Profile shared with you",
          message: `shared ${displayName}'s profile with you`,
          avatar_url: avatarUrl || null,
          link: profileUrl,
        },
      });
      setSentTo((prev) => new Set(prev).add(friend.user_id));
      toast.success(`Shared with ${friend.display_name || friend.username || "friend"}!`);
    } catch {
      toast.error("Failed to share");
    }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSentTo(new Set()); }}>
      <DrawerTrigger asChild>
        <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full">
          <Send className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[60vh]">
        <DrawerHeader>
          <DrawerTitle>Share Profile</DrawerTitle>
        </DrawerHeader>

        {/* Share to Friends */}
        {user && (
          <div className="border-b border-border pb-3 mb-1">
            <p className="text-sm font-semibold text-foreground px-4 mb-3">Share to Friends</p>
            <div className="overflow-x-auto">
              <div className="flex gap-4 px-4 pb-2" style={{ minWidth: "min-content" }}>
                <button className="flex flex-col items-center gap-1.5 min-w-[64px]">
                  <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Search</span>
                </button>

                {friends.map((friend) => {
                  const alreadySent = sentTo.has(friend.user_id);
                  return (
                    <button
                      key={friend.user_id}
                      onClick={() => handleShareToFriend(friend)}
                      disabled={alreadySent}
                      className="flex flex-col items-center gap-1.5 min-w-[64px] disabled:opacity-50"
                    >
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={friend.avatar_url || undefined} surface="share-profile-friend" />
                        <AvatarFallback className="text-sm">
                          {(friend.display_name || friend.username || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-foreground font-medium max-w-[64px] truncate">
                        {alreadySent ? "Sent ✓" : (friend.display_name || friend.username || "Friend")}
                      </span>
                    </button>
                  );
                })}

                {friends.length === 0 && (
                  <p className="text-xs text-muted-foreground self-center pl-2">Add friends to share directly</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* External share options */}
        <div className="px-4 pb-6 pt-2">
          <div className="flex gap-4 overflow-x-auto" style={{ minWidth: "min-content" }}>
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1.5 min-w-[64px]"
            >
              <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                <Copy className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-[11px] text-foreground font-medium">Copy Link</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex flex-col items-center gap-1.5 min-w-[64px]"
            >
              <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-[11px] text-foreground font-medium">WhatsApp</span>
            </button>
            {typeof navigator.share === "function" && (
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-1.5 min-w-[64px]"
              >
                <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-[11px] text-foreground font-medium">More</span>
              </button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ShareProfileSheet;
