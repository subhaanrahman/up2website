import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Phone, ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const phoneSchema = z.string().min(10, "Please enter a valid phone number");
const otpSchema = z.string().length(6, "OTP must be 6 digits");

const Auth = () => {
  const navigate = useNavigate();
  const { signInWithPhone, verifyOtp, user } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  if (user) {
    navigate("/dashboard");
    return null;
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Add + prefix if not present and has digits
    if (digits.length > 0 && !value.startsWith("+")) {
      return "+" + digits;
    }
    return value.startsWith("+") ? "+" + digits : digits;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const formattedPhone = formatPhoneNumber(phone);
    const result = phoneSchema.safeParse(formattedPhone);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error } = await signInWithPhone(formattedPhone);

    if (error) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOtpSent(true);
      setPhone(formattedPhone);
      toast({
        title: "Code sent!",
        description: "Check your phone for the verification code.",
      });
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = otpSchema.safeParse(otp);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error } = await verifyOtp(phone, otp);

    if (error) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome!",
        description: "You've successfully signed in.",
      });
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Eventful</span>
          </div>
          
          {!otpSent ? (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome
              </h1>
              <p className="text-muted-foreground">
                Enter your phone number to get started
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Enter verification code
              </h1>
              <p className="text-muted-foreground">
                We sent a code to <span className="font-medium text-foreground">{phone}</span>
              </p>
            </>
          )}
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="bg-card rounded-xl p-6 shadow-lg space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  "Sending..."
                ) : (
                  <>
                    Send Code
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-card rounded-xl p-6 shadow-lg space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  disabled={loading}
                  maxLength={6}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  "Verifying..."
                ) : (
                  <>
                    Verify & Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setError("");
                }}
                className="w-full"
              >
                Use a different number
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Auth;
