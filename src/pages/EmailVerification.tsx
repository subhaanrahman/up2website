import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import {
  FormFieldCard,
  FormFieldLabel,
  FormFlowHeader,
  FormFlowMain,
  FormFlowScreen,
  formFlowInputClass,
  formFlowPrimaryButtonClass,
} from "@/components/form-flow/FormFlowLayout";

type Step = "email" | "otp" | "verified";

const EmailVerification = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const [step, setStep] = useState<Step>(
    profile?.email && (profile as { emailVerified?: boolean }).emailVerified ? "verified" : "email"
  );
  const [email, setEmail] = useState(profile?.email || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await callEdgeFunction("email-verify-send", { body: { email } });
      toast({ title: "Code sent", description: `A verification code has been sent to ${email}.` });
      setStep("otp");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send code.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await callEdgeFunction("email-verify-confirm", { body: { code } });
      toast({ title: "Email verified!", description: "Your email has been successfully verified." });
      setStep("verified");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid or expired code.";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormFlowScreen>
      <FormFlowHeader title="Email" onBack={() => navigate(-1)} balanceRight />
      <FormFlowMain>
        {step === "verified" && (
          <div className="text-center space-y-4 pt-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Verified</h2>
            <p className="text-muted-foreground text-sm">
              Your email <span className="font-medium text-foreground">{profile?.email || email}</span> is verified.
            </p>
            <Button
              type="button"
              variant="outline"
              className="rounded-full font-bold tracking-widest text-xs mt-2"
              onClick={() => {
                setStep("email");
                setEmail("");
                setCode("");
              }}
            >
              Change email
            </Button>
          </div>
        )}

        {step === "email" && (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Add email</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Optional — adds another way to secure your account.
              </p>
            </div>

            <FormFieldCard className="px-4 pt-4 pb-4">
              <FormFieldLabel>Email address</FormFieldLabel>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={formFlowInputClass}
              />
            </FormFieldCard>

            <Button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || !email.trim()}
              className={formFlowPrimaryButtonClass}
            >
              {loading ? "SENDING…" : "SEND CODE"}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-2">
              <h2 className="text-base font-semibold text-foreground">Enter code</h2>
              <p className="text-muted-foreground text-sm">
                Sent to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <FormFieldCard className="px-4 py-6 flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </FormFieldCard>

            <Button
              type="button"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className={formFlowPrimaryButtonClass}
            >
              {loading ? "VERIFYING…" : "VERIFY"}
            </Button>

            <div className="text-center space-y-2 pt-2">
              <button type="button" onClick={handleSendOtp} className="text-sm text-primary font-medium" disabled={loading}>
                Resend code
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                  className="text-sm text-muted-foreground"
                >
                  Change email
                </button>
              </div>
            </div>
          </div>
        )}
      </FormFlowMain>
    </FormFlowScreen>
  );
};

export default EmailVerification;
