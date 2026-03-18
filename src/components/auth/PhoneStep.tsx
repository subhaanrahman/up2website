import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import PhoneInput from "@/components/PhoneInput";
import { config } from "@/infrastructure/config";
import { z } from "zod";

const phoneSchema = z.string().min(8, "Please enter a valid phone number");

interface PhoneStepProps {
  onPhoneChecked: (phone: string, exists: boolean) => void;
  /** When true, only send OTP for new users (skip for returning users going to password) */
  sendOtpForNewUsersOnly?: boolean;
}

const PhoneStep = ({ onPhoneChecked, sendOtpForNewUsersOnly }: PhoneStepProps) => {
  const { checkPhone, sendOtp } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [welcomeText, setWelcomeText] = useState("");

  useEffect(() => {
    const full = "Welcome";
    let index = 0;
    setWelcomeText("");
    const id = setInterval(() => {
      index += 1;
      setWelcomeText(full.slice(0, index));
      if (index >= full.length) {
        clearInterval(id);
      }
    }, 80);
    return () => clearInterval(id);
  }, []);

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
      let msg = checkErr.message;
      if (config.isDev && 'details' in checkErr && typeof (checkErr as { details?: unknown }).details === 'object') {
        const d = (checkErr as { details?: Record<string, unknown> }).details;
        if (d?.status !== undefined || d?.bodyExcerpt) {
          const debug = [`status ${d?.status ?? '?'}`, d?.bodyExcerpt].filter(Boolean).join(' | ');
          msg += ` (${debug})`;
        }
      }
      setError(msg);
      setLoading(false);
      return;
    }

    // Send OTP only when user will see OTP step (new users). Returning users go to password, no OTP needed.
    const shouldSendOtp = !sendOtpForNewUsersOnly || !exists;
    if (shouldSendOtp) {
      const { error: otpErr } = await sendOtp(phone);
      if (otpErr) {
        setError(otpErr.message);
        toast({ title: "Error sending code", description: otpErr.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onPhoneChecked(phone, exists);
  };

  return (
    <>
      <div className="text-center mb-6 animate-in fade-in slide-in-from-bottom-2 duration-2000 ease-out">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {welcomeText}
          <span className="inline-block w-[1ch] animate-pulse text-primary">|</span>
        </h1>
        <p className="text-muted-foreground">Enter your phone number to get started</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-2000 ease-out delay-200"
      >
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
