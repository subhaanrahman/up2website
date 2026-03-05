import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import PhoneInput from "@/components/PhoneInput";
import { z } from "zod";

const phoneSchema = z.string().min(8, "Please enter a valid phone number");

interface PhoneStepProps {
  onPhoneChecked: (phone: string, exists: boolean) => void;
}

const PhoneStep = ({ onPhoneChecked }: PhoneStepProps) => {
  const { checkPhone, sendOtp } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = phoneSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    // Check if phone exists — this should be fast
    const { exists, error: checkErr } = await checkPhone(phone);

    if (checkErr) {
      setError(checkErr.message);
      setLoading(false);
      return;
    }

    // Navigate immediately — don't wait for OTP send
    setLoading(false);
    onPhoneChecked(phone, exists);

    if (!exists) {
      // Fire-and-forget: send OTP in background after navigating
      sendOtp(phone).then(({ error: otpErr }) => {
        if (otpErr) {
          toast({ title: "Error sending code", description: otpErr.message, variant: "destructive" });
        }
      });
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome</h1>
        <p className="text-muted-foreground">Enter your phone number to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-foreground">Phone number</Label>
          <PhoneInput value={phone} onChange={setPhone} disabled={loading} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button type="submit" className="w-full h-14 text-lg gap-2" disabled={loading}>
          {loading ? "Checking..." : (
            <>Continue <ArrowRight className="h-5 w-5" /></>
          )}
        </Button>
      </form>
    </>
  );
};

export default PhoneStep;
