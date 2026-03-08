import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Copy, MessageCircle, Share2, Instagram, Twitter, Facebook, Mail } from "lucide-react";
import { toast } from "sonner";

interface ShareEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventUrl: string;
  eventTitle: string;
}

const ShareEventSheet = ({ open, onOpenChange, eventUrl, eventTitle }: ShareEventSheetProps) => {
  const shareText = `Check out ${eventTitle}!`;

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
    // Instagram doesn't support direct URL sharing — copy link instead
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

  const shareOptions = [
    { label: "Copy Link", icon: Copy, onClick: handleCopyLink },
    { label: "WhatsApp", icon: MessageCircle, onClick: handleWhatsApp },
    { label: "Instagram", icon: Instagram, onClick: handleInstagram },
    { label: "X / Twitter", icon: Twitter, onClick: handleTwitter },
    { label: "Facebook", icon: Facebook, onClick: handleFacebook },
    { label: "Email", icon: Mail, onClick: handleEmail },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[50vh]">
        <DrawerHeader>
          <DrawerTitle>Share Event</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 grid grid-cols-4 gap-4">
          {shareOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={opt.onClick}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <opt.icon className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-xs text-foreground font-medium">{opt.label}</span>
            </button>
          ))}
          {typeof navigator.share === "function" && (
            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Share2 className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-xs text-foreground font-medium">More</span>
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ShareEventSheet;
