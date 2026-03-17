import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_ID = "qr-scanner-reader";

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QrScanner({ onScan, onError, disabled, className }: QrScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (disabled) return;

    const html5QrCode = new Html5Qrcode(SCANNER_ID);
    const config = { fps: 5, qrbox: { width: 250, height: 250 } };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (decodedText: string) => {
          onScanRef.current(decodedText);
        },
        (err: string) => {
          setCameraError(err || "Camera access denied");
          onError?.(err);
        },
      )
      .catch((err: Error) => {
        setCameraError(err?.message || "Failed to start camera");
        onError?.(err?.message);
      });

    return () => {
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [disabled, onError]);

  if (disabled) return null;

  return (
    <div className={className}>
      <div id={SCANNER_ID} className="rounded-lg overflow-hidden [&_video]:rounded-lg" />
      {cameraError && (
        <p className="text-sm text-destructive mt-2">{cameraError}</p>
      )}
    </div>
  );
}
