import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DigitalIdWalletActions from "@/components/DigitalIdWalletActions";

interface ProfileQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  username: string;
  avatarUrl?: string;
  profileUrl: string;
  /** Check-in code (PID) — same payload as Digital ID settings and scanners. */
  digitalIdQrPayload: string | null;
}

const ProfileQrModal = ({
  open,
  onOpenChange,
  displayName,
  username,
  avatarUrl,
  profileUrl,
  digitalIdQrPayload,
}: ProfileQrModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-none p-0 max-w-sm w-full sm:rounded-tile-sm flex flex-col">
        <div className="pt-6 pb-2 px-6">
          <h2 className="text-xl font-bold text-foreground text-center tracking-wide">
            DIGITAL ID
          </h2>
        </div>

        <div className="flex flex-col items-center px-6 pb-6 gap-5">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-xl bg-card text-foreground font-bold">
                {(displayName || username || "U")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-bold text-foreground">{displayName || username}</p>
              <p className="text-sm text-muted-foreground">@{username}</p>
            </div>
          </div>

          {/* Check-in QR (PID) */}
          {digitalIdQrPayload ? (
            <div className="bg-card rounded-tile p-6">
              <QRCodeSVG
                value={digitalIdQrPayload}
                size={200}
                bgColor="transparent"
                fgColor="hsl(var(--foreground))"
                level="M"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center px-2">
              Your check-in code is not ready yet. Try again after your profile finishes loading.
            </p>
          )}

          {/* Copy profile link */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy profile link"}
          </button>

          <DigitalIdWalletActions canUseWallet={!!digitalIdQrPayload} />
        </div>

        {/* Back button */}
        <div className="p-6 pt-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileQrModal;
