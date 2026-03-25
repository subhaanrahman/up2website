import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { walletApi } from "@/api";
import { downloadAppleWalletPass } from "@/lib/walletClient";
import { ApiError } from "@/infrastructure/errors";

type Props = {
  /** When false, wallet buttons are disabled (e.g. no PID yet). */
  canUseWallet: boolean;
};

const DigitalIdWalletActions = ({ canUseWallet }: Props) => {
  const { toast } = useToast();
  const [appleBusy, setAppleBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  const onApple = async () => {
    setAppleBusy(true);
    try {
      await downloadAppleWalletPass();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not add to Apple Wallet";
      toast({ title: "Apple Wallet", description: msg, variant: "destructive" });
    } finally {
      setAppleBusy(false);
    }
  };

  const onGoogle = async () => {
    setGoogleBusy(true);
    try {
      const { saveUrl } = await walletApi.getGoogleWalletSaveUrl();
      // New tab keeps the app open (helps testing on desktop / Mac without Android).
      const opened = window.open(saveUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = saveUrl;
      }
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not open Google Wallet";
      toast({ title: "Google Wallet", description: msg, variant: "destructive" });
    } finally {
      setGoogleBusy(false);
    }
  };

  const disabled = !canUseWallet;

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      {!isIOS && (
        <p className="text-xs text-muted-foreground text-center px-2">
          To add to Apple Wallet, open Up2 on your iPhone (Safari) and use this button.
        </p>
      )}
      {!isAndroid && (
        <p className="text-xs text-muted-foreground text-center px-2">
          Google Wallet opens in a new tab. Use Chrome with a Google account, or an Android phone, to save the pass.
        </p>
      )}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={disabled || appleBusy}
        onClick={onApple}
      >
        {appleBusy ? "Preparing…" : "Add to Apple Wallet"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={disabled || googleBusy}
        onClick={onGoogle}
      >
        {googleBusy ? "Opening…" : "Add to Google Wallet"}
      </Button>
    </div>
  );
};

export default DigitalIdWalletActions;
