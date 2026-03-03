import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const otpSchema = z.string().length(6, "OTP must be 6 digits");

interface OtpStepProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

const OtpStep = ({ phone, onVerified, onBack }: OtpStepProps) => {
  const { verifyOtp } = useAuth();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = otpSchema.safeParse(otp);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error: verifyErr } = await verifyOtp(phone, otp);

    if (verifyErr) {
      setError(verifyErr.message);
      toast({ title: "Error", description: verifyErr.message, variant: "destructive" });
    } else {
      onVerified();
    }

    setLoading(false);
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
      </form>
    </>
  );
};

export default OtpStep;
