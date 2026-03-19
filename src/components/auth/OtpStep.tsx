import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const otpSchema = z.string().length(6, "OTP must be 6 digits");
const RESEND_COOLDOWN_MS = 60_000;

interface OtpStepProps {
  phone: string;
  isReturningUser?: boolean;
  onVerified: () => void;
  onBack: () => void;
}

const OtpStep = ({ phone, isReturningUser, onVerified, onBack }: OtpStepProps) => {
  const { verifyOtp, sendOtp } = useAuth();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number>(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = otpSchema.safeParse(otp);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error: verifyErr, loggedIn } = await verifyOtp(phone, otp);

    if (verifyErr) {
      setError(verifyErr.message);
      toast({ title: "Error", description: verifyErr.message, variant: "destructive" });
    } else if (loggedIn) {
      // Session set, redirect will happen
    } else if (isReturningUser) {
      const msg = "Couldn't sign you in with this code. Please request a new code and try again.";
      setError(msg);
      toast({ title: "Sign in failed", description: msg, variant: "destructive" });
    } else {
      onVerified(); // New user: go to register
    }

    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendCooldownUntil > Date.now()) return;
    setError("");
    const { error: sendErr } = await sendOtp(phone);
    if (sendErr) {
      setError(sendErr.message);
      toast({ title: "Error sending code", description: sendErr.message, variant: "destructive" });
      return;
    }
    setResendCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    cooldownIntervalRef.current = setInterval(() => {
      setResendCooldownUntil((prev) => {
        if (prev <= Date.now()) {
          if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
          return 0;
        }
        return prev;
      });
    }, 1000);
    toast({ title: "Code sent", description: "Check your phone for the new verification code." });
  };

  return (
    <>
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Enter code</h1>
        <p className="text-muted-foreground">
          We sent a code to <span className="font-medium text-foreground">{phone}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="otp" className="text-foreground">Verification code</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-3xl tracking-[0.5em] h-16 bg-card border-border font-mono"
            disabled={loading}
            maxLength={6}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg gap-2"
          disabled={loading || otp.length !== 6}
        >
          {loading ? "Verifying..." : (
            <>Verify <ArrowRight className="h-5 w-5" /></>
          )}
        </Button>

        <Button type="button" variant="ghost" onClick={onBack} className="w-full">
          Use a different number
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {resendCooldownUntil > Date.now() ? (
            <>Resend code in {Math.ceil((resendCooldownUntil - Date.now()) / 1000)}s</>
          ) : (
            <button
              type="button"
              onClick={handleResendOtp}
              className="text-primary underline hover:no-underline"
            >
              Didn&apos;t get it? Resend code
            </button>
          )}
        </p>

      </form>
    </>
  );
};

export default OtpStep;
