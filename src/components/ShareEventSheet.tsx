import { useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Copy, MessageCircle, Share2, Instagram, Twitter, Facebook, Mail, Camera } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import StoryCardPreview from "@/components/StoryCardPreview";

interface ShareEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventUrl: string;
  eventTitle: string;
  eventDate?: string;
  eventLocation?: string;
  eventImage?: string;
}

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
      // Render at 3x for high-res (1080×1920)
      const dataUrl = await toPng(storyRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });

      // Try native share with file if available
      if (navigator.share && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], "event-story.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: eventTitle,
            text: `${shareText}\n${eventUrl}`,
          });
          onOpenChange(false);
          return;
        }
      }

      // Fallback: download the image
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

  const shareOptions = [
    { label: "Copy Link", icon: Copy, onClick: handleCopyLink },
    { label: "IG Story", icon: Camera, onClick: handleInstagramStory, loading: generatingStory },
    { label: "WhatsApp", icon: MessageCircle, onClick: handleWhatsApp },
    { label: "Instagram", icon: Instagram, onClick: handleInstagram },
    { label: "X / Twitter", icon: Twitter, onClick: handleTwitter },
    { label: "Facebook", icon: Facebook, onClick: handleFacebook },
    { label: "Email", icon: Mail, onClick: handleEmail },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[60vh]">
        <DrawerHeader>
          <DrawerTitle>Share Event</DrawerTitle>
        </DrawerHeader>

        {/* Story card preview — visible as a small preview */}
        <div className="px-4 pb-3 flex justify-center">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
            <StoryCardPreview
              ref={storyRef}
              eventTitle={eventTitle}
              eventDate={eventDate}
              eventLocation={eventLocation}
              eventImage={eventImage}
            />
          </div>
        </div>

        <div className="px-4 pb-6 grid grid-cols-4 gap-4">
          {shareOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={opt.onClick}
              disabled={"loading" in opt && opt.loading}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <opt.icon className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-xs text-foreground font-medium">
                {"loading" in opt && opt.loading ? "Creating..." : opt.label}
              </span>
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
