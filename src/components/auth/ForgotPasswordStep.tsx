import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PASSWORD_RULES } from "@/utils/passwordValidation";
import { z } from "zod";

const otpSchema = z.string().length(6, "OTP must be 6 digits");

const RESEND_COOLDOWN_MS = 60_000;

function isNetworkError(msg: string): boolean {
  return /failed to fetch|network error/i.test(msg);
}

function formatNetworkError(): string {
  return "Could not reach the server. Check your connection and that VITE_SUPABASE_URL points to your project (not localhost if using hosted Supabase).";
}

type ForgotStep = "verify" | "new-password";

interface ForgotPasswordStepProps {
  phone: string;
  onSuccess: () => void;
  onBack: () => void;
}

const ForgotPasswordStep = ({ phone, onSuccess, onBack }: ForgotPasswordStepProps) => {
  const { sendOtp, forgotPasswordCheck, forgotPasswordReset } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<ForgotStep>("verify");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number>(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, []);

  const handleSendOtp = async (isResend = false) => {
    setError("");
    setLoading(true);
    const { error: sendErr } = await sendOtp(phone);
    setLoading(false);
    if (sendErr) {
      const msg = isNetworkError(sendErr.message) ? formatNetworkError() : sendErr.message;
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
      return;
    }
    setCodeSent(true);
    setOtp("");
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
    toast({
      title: isResend ? "New code sent" : "Code sent",
      description: isResend ? "Use the code from your most recent message." : "Check your phone for the verification code.",
    });
  };

  const handleResendOtp = () => {
    if (resendCooldownUntil > Date.now()) return;
    handleSendOtp(true);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = otpSchema.safeParse(otp);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { result: checkResult, error: checkErr } = await forgotPasswordCheck(phone, otp);
    setLoading(false);
    if (checkErr) {
      const msg = isNetworkError(checkErr.message)
        ? formatNetworkError()
        : /invalid|expired/i.test(checkErr.message)
          ? "That code wasn't valid. Request a new code below and use the one from your latest text."
          : checkErr.message;
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
      return;
    }
    if (!checkResult?.resetToken) {
      const msg = "That code wasn't valid. Request a new code below and use the one from your latest text.";
      setError(msg);
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
      return;
    }
    setResetToken(checkResult.resetToken);
    setStep("new-password");
    setError("");
  };

  const allPasswordRulesPass = PASSWORD_RULES.every((r) => r.test(newPassword));
  const isPasswordFormValid = allPasswordRulesPass;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!resetToken) {
      setError("Session expired. Please start over.");
      setStep("verify");
      setResetToken(null);
      return;
    }
    if (!allPasswordRulesPass) {
      setError("Password must meet all requirements");
      return;
    }
    setLoading(true);
    const { error: resetErr } = await forgotPasswordReset(resetToken, newPassword);
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
      toast({ title: "Error", description: resetErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "You can now sign in with your new password." });
    onSuccess();
  };

  const handleBackFromPassword = () => {
    setResetToken(null);
    setStep("verify");
    setNewPassword("");
    setError("");
  };

  if (step === "new-password") {
    return (
      <>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Set new password</h1>
          <p className="text-muted-foreground">
            Enter a new password for your account.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-foreground">New password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-14 bg-card border-border pr-12"
                disabled={loading}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {newPassword && (
              <div className="space-y-1 mt-2">
                {PASSWORD_RULES.map((rule) => {
                  const passes = rule.test(newPassword);
                  return (
                    <div key={rule.label} className="flex items-center gap-2 text-sm">
                      {passes ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className={passes ? "text-muted-foreground" : "text-destructive"}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full h-14 text-lg gap-2"
            disabled={loading || !isPasswordFormValid}
          >
            {loading ? "Resetting..." : (
              <>Reset password <ArrowRight className="h-5 w-5" /></>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleBackFromPassword}
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Reset password</h1>
        <p className="text-muted-foreground">
          We&apos;ll send a code to <span className="font-medium text-foreground">{phone}</span>
        </p>
      </div>

      <div className="space-y-6">
        {!codeSent ? (
          <Button
            type="button"
            className="w-full h-14 text-lg"
            onClick={handleSendOtp}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send code"}
          </Button>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
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
              {resendCooldownUntil > Date.now() ? (
                <p className="text-sm text-muted-foreground text-center">
                  Resend code in {Math.ceil((resendCooldownUntil - Date.now()) / 1000)}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-primary hover:underline mx-auto block"
                >
                  Didn&apos;t get it? Resend code
                </button>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full h-14 text-lg gap-2"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : (
                <>Continue <ArrowRight className="h-5 w-5" /></>
              )}
            </Button>
          </form>
        )}

        <Button type="button" variant="ghost" onClick={onBack} className="w-full">
          Back to sign in
        </Button>
      </div>
    </>
  );
};

export default ForgotPasswordStep;
