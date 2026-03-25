import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { profileApi } from "@/api";
import { profileKeys } from "@/hooks/useProfileQuery";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import BottomNav from "@/components/BottomNav";
import DigitalIdWalletActions from "@/components/DigitalIdWalletActions";

const DigitalIdSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);

  const qrCode = profile?.qrCode;

  const handleRegenerate = async () => {
    if (!user) return;
    setRegenerating(true);
    try {
      const result = await profileApi.regenerateProfileQr();
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.id) });
      toast({
        title: "Digital ID regenerated",
        description: "Your new QR code is active. Any previously printed or saved QR codes will no longer work.",
      });
      if (result?.qr_code) {
        queryClient.setQueryData(profileKeys.detail(user.id), (prev: typeof profile) =>
          prev ? { ...prev, qrCode: result.qr_code } : prev
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to regenerate";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 py-4 relative">
          <h1 className="text-xl font-bold text-foreground text-center">Digital ID</h1>
          <button onClick={() => navigate(-1)} className="absolute left-2 p-2 -ml-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-md mx-auto">
        <div className="rounded-tile-sm bg-card border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Your Personal QR Code</h2>
              <p className="text-sm text-muted-foreground">
                This is your digital ID. Use it at any event for check-in.
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Show this QR code at the door when attending events. It works as your ticket for free events (RSVP) and paid events (purchased tickets).
          </p>

          {qrCode ? (
            <div className="flex flex-col items-center py-6">
              <div className="bg-background p-4 rounded-lg">
                <QRCodeSVG
                  value={qrCode}
                  size={200}
                  bgColor="transparent"
                  fgColor="currentColor"
                  className="text-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-3 break-all text-center max-w-[240px]">
                {qrCode}
              </p>
              <div className="w-full max-w-xs mt-6">
                <p className="text-xs font-medium text-foreground text-center mb-2">Add to device wallet</p>
                <DigitalIdWalletActions canUseWallet />
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <p className="text-sm">No QR code yet. Run database migration to add profile QR codes.</p>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <h3 className="font-medium text-foreground mb-2">Regenerate if compromised</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If someone may have copied your QR code, regenerate it. Your old code will stop working and your tickets will use the new one.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRegenerate}
              disabled={regenerating || !qrCode}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Regenerating..." : "Regenerate Digital ID"}
            </Button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default DigitalIdSettings;
