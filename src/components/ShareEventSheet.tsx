import { useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { Copy, MessageCircle, Share2, Instagram, Twitter, Facebook, Mail, Camera, Search } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import StoryCardPreview from "@/components/StoryCardPreview";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ShareEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventUrl: string;
  eventTitle: string;
  eventDate?: string;
  eventLocation?: string;
  eventImage?: string;
}

interface FriendProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

const CARD_THEMES = [
  { bg: "from-primary to-primary/70", dot: "bg-primary" },
  { bg: "from-purple-600 to-violet-900", dot: "bg-purple-600" },
  { bg: "from-zinc-700 to-zinc-900", dot: "bg-zinc-700" },
  { bg: "from-rose-600 to-pink-900", dot: "bg-rose-600" },
];

const ShareEventSheet = ({
  open,
  onOpenChange,
  eventUrl,
  eventTitle,
  eventDate = "",
  eventLocation = "",
  eventImage,
}: ShareEventSheetProps) => {
  const shareText = `Check out ${eventTitle}!`;
  const storyRef = useRef<HTMLDivElement>(null);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [activeTheme, setActiveTheme] = useState(0);
  const { user } = useAuth();

  // Fetch accepted friends
  const { data: friends = [] } = useQuery<FriendProfile[]>({
    queryKey: ["share-friends", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get accepted connections where user is requester or addressee
      const { data: connections } = await supabase
        .from("connections")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

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
    await navigator.clipboard.writeText(eventUrl);
    toast.success("Link copied!");
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${eventUrl}`)}`, "_blank");
    onOpenChange(false);
  };

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`, "_blank");
    onOpenChange(false);
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`, "_blank");
    onOpenChange(false);
  };

  const handleInstagram = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success("Link copied — paste it in your Instagram story!");
    onOpenChange(false);
  };

  const handleEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(`${shareText}\n\n${eventUrl}`)}`, "_blank");
    onOpenChange(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: eventTitle, text: shareText, url: eventUrl });
      onOpenChange(false);
    }
  };

  const handleInstagramStory = async () => {
    if (!storyRef.current) return;
    setGeneratingStory(true);
    try {
      const dataUrl = await toPng(storyRef.current, { pixelRatio: 3, cacheBust: true });

      if (navigator.share && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], "event-story.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: eventTitle, text: `${shareText}\n${eventUrl}` });
          onOpenChange(false);
          return;
        }
      }

      const link = document.createElement("a");
      link.download = `${eventTitle.replace(/[^a-z0-9]/gi, "_")}_story.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Story image downloaded — upload it to your Instagram story!");
      onOpenChange(false);
    } catch (err) {
      console.error("Story generation failed", err);
      toast.error("Failed to generate story image");
    } finally {
      setGeneratingStory(false);
    }
  };

  const handleShareToFriend = async (friend: FriendProfile) => {
    // Send a notification to this friend about the event
    if (!user) return;
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: friend.user_id,
        title: "Event shared with you",
        message: `shared "${eventTitle}" with you`,
        type: "event_share",
        link: eventUrl,
        avatar_url: null,
        event_image: eventImage || null,
      });
      if (error) throw error;
      toast.success(`Shared with ${friend.display_name || friend.username || "friend"}!`);
    } catch {
      toast.error("Failed to share");
    }
  };

  const themeColors: Record<number, { cardBg: string; accent: string }> = {
    0: { cardBg: "#7c3aed", accent: "#a855f7" },
    1: { cardBg: "#7c3aed", accent: "#8b5cf6" },
    2: { cardBg: "#3f3f46", accent: "#71717a" },
    3: { cardBg: "#be123c", accent: "#e11d48" },
  };

  const shareOptions = [
    { label: "Copy link", icon: Copy, onClick: handleCopyLink },
    { label: "IG Story", icon: Camera, onClick: handleInstagramStory, loading: generatingStory },
    { label: "WhatsApp", icon: MessageCircle, onClick: handleWhatsApp },
    { label: "Instagram", icon: Instagram, onClick: handleInstagram },
    { label: "X", icon: Twitter, onClick: handleTwitter },
    { label: "Facebook", icon: Facebook, onClick: handleFacebook },
    { label: "Email", icon: Mail, onClick: handleEmail },
  ];

  // Add native share if supported
  if (typeof navigator.share === "function") {
    shareOptions.push({ label: "More", icon: Share2, onClick: handleNativeShare });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] pb-safe">
        {/* Drag handle is built into DrawerContent */}

        {/* Story card preview - scaled down for display, full size for export */}
        <div className="flex justify-center pt-2 pb-1 px-4" style={{
          height: `${(1920 / 3) * 0.5 + 16}px`,
        }}>
          <div className="rounded-xl overflow-hidden" style={{
            boxShadow: `0 6px 30px ${themeColors[activeTheme]?.accent || "#a855f7"}44`,
            transform: "scale(0.5)",
            transformOrigin: "top center",
          }}>
            <StoryCardPreview
              ref={storyRef}
              eventTitle={eventTitle}
              eventDate={eventDate}
              eventLocation={eventLocation}
              eventImage={eventImage}
            />
          </div>
        </div>

        {/* Theme color dots */}
        <div className="flex justify-center gap-3 pb-4">
          {CARD_THEMES.map((theme, i) => (
            <button
              key={i}
              onClick={() => setActiveTheme(i)}
              className={`h-8 w-8 rounded-full transition-all ${theme.dot} ${
                activeTheme === i
                  ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                  : "opacity-60 hover:opacity-100"
              }`}
            />
          ))}
        </div>

        {/* Share to Friends section */}
        {user && (
          <div className="border-t border-border pt-3 pb-2">
            <p className="text-sm font-semibold text-foreground px-4 mb-3">Share to Friends</p>
            <div className="overflow-x-auto">
              <div className="flex gap-4 px-4 pb-2" style={{ minWidth: "min-content" }}>
                {/* Search icon */}
                <button className="flex flex-col items-center gap-1.5 min-w-[64px]">
                  <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Search</span>
                </button>

                {friends.map((friend) => (
                  <button
                    key={friend.user_id}
                    onClick={() => handleShareToFriend(friend)}
                    className="flex flex-col items-center gap-1.5 min-w-[64px]"
                  >
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="text-sm">
                        {(friend.display_name || friend.username || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-foreground font-medium max-w-[64px] truncate">
                      {friend.display_name || friend.username || "Friend"}
                    </span>
                  </button>
                ))}

                {friends.length === 0 && (
                  <p className="text-xs text-muted-foreground self-center pl-2">Add friends to share directly</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share options - horizontal scroll */}
        <div className="border-t border-border pt-3 pb-6 px-4">
          <div className="overflow-x-auto">
            <div className="flex gap-4" style={{ minWidth: "min-content" }}>
              {shareOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={opt.onClick}
                  disabled={"loading" in opt && opt.loading}
                  className="flex flex-col items-center gap-1.5 min-w-[64px] disabled:opacity-50"
                >
                  <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                    <opt.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="text-[11px] text-foreground font-medium">
                    {"loading" in opt && opt.loading ? "Creating..." : opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ShareEventSheet;
