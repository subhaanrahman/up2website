import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import logoFull from "@/assets/logo-full.png";

const phoneSchema = z.string().min(10, "Please enter a valid phone number");
const otpSchema = z.string().length(6, "OTP must be 6 digits");

const Auth = () => {
  const navigate = useNavigate();
  const { signInWithPhone, verifyOtp, user, mockLogin } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
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
      navigate("/");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile App-like Auth Screen */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="mb-8">
              <img src={logoFull} alt="Up2" className="h-16 w-auto mx-auto" />
            </div>
            
            {!otpSent ? (
              <>
                <h1 className="text-2xl font-bold text-foreground mb-2">
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
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Enter code
                </h1>
                <p className="text-muted-foreground">
                  We sent a code to <span className="font-medium text-foreground">{phone}</span>
                </p>
              </>
            )}
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-12 h-14 text-lg bg-card border-border"
                    disabled={loading}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg gap-2"
                disabled={loading}
              >
                {loading ? (
                  "Sending..."
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
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
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg gap-2"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  "Verifying..."
                ) : (
                  <>
                    Verify
                    <ArrowRight className="h-5 w-5" />
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
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>

          {/* Dev Login Button */}
          <div className="mt-8 pt-8 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                mockLogin();
                navigate("/");
              }}
              className="w-full"
            >
              🔧 Dev Login (Skip Auth)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
