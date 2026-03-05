import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Send, Copy, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareProfileSheetProps {
  profileUrl: string;
  displayName: string;
}

const ShareProfileSheet = ({ profileUrl, displayName }: ShareProfileSheetProps) => {
  const [open, setOpen] = useState(false);

  const fullUrl = `${window.location.origin}${profileUrl}`;

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

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full">
          <Send className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[40vh]">
        <DrawerHeader>
          <DrawerTitle>Share Profile</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 grid grid-cols-3 gap-4">
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
              <Copy className="h-5 w-5 text-foreground" />
            </div>
            <span className="text-xs text-foreground font-medium">Copy Link</span>
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-foreground" />
            </div>
            <span className="text-xs text-foreground font-medium">WhatsApp</span>
          </button>
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

export default ShareProfileSheet;
