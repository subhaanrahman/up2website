import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";

type Step = "email" | "otp" | "verified";

const EmailVerification = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const [step, setStep] = useState<Step>(
    profile?.email && (profile as any).emailVerified ? "verified" : "email"
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
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to send code.", variant: "destructive" });
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
    } catch (err: any) {
      toast({ title: "Verification failed", description: err?.message || "Invalid or expired code.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 py-4 relative">
          <h1 className="text-xl font-bold text-foreground text-center">EMAIL VERIFICATION</h1>
          <button onClick={() => navigate(-1)} className="absolute left-2 p-2 -ml-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
        </div>
      </header>

      <main className="px-4 py-8 max-w-sm mx-auto">
        {step === "verified" && (
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Email Verified</h2>
            <p className="text-muted-foreground text-sm">
              Your email <span className="font-medium text-foreground">{profile?.email || email}</span> is verified.
            </p>
            <Button variant="outline" onClick={() => { setStep("email"); setEmail(""); setCode(""); }} className="mt-4">
              Change email
            </Button>
          </div>
        )}

        {step === "email" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Verify Your Email</h2>
              <p className="text-muted-foreground text-sm">
                Add an email for additional account security. This is completely optional.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <Button onClick={handleSendOtp} disabled={loading || !email.trim()} className="w-full">
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Enter Code</h2>
              <p className="text-muted-foreground text-sm">
                We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <div className="flex justify-center">
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
            </div>

            <Button onClick={handleVerify} disabled={loading || code.length !== 6} className="w-full">
              {loading ? "Verifying..." : "Verify"}
            </Button>

            <div className="text-center space-y-2">
              <button onClick={handleSendOtp} className="text-sm text-primary underline" disabled={loading}>
                Resend code
              </button>
              <br />
              <button onClick={() => { setStep("email"); setCode(""); }} className="text-sm text-muted-foreground">
                Change email
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmailVerification;
