import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logoFull from "@/assets/logo-full.png";
import PhoneStep from "@/components/auth/PhoneStep";
import OtpStep from "@/components/auth/OtpStep";
import PasswordStep from "@/components/auth/PasswordStep";
import RegisterStep from "@/components/auth/RegisterStep";
import { Button } from "@/components/ui/button";

type AuthStep = "phone" | "otp" | "password" | "register";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/profile";
  const { user, mockLogin } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  // Redirect if already logged in
  if (user) {
    navigate(from);
    return null;
  }

  const handlePhoneChecked = (phoneNumber: string, exists: boolean) => {
    setPhone(phoneNumber);
    setIsNewUser(!exists);
    if (exists) {
      // Returning user → password login
      setStep("password");
    } else {
      // New user → send OTP for verification
      setStep("otp");
    }
  };

  const handleOtpVerified = () => {
    // OTP verified → collect registration details
    setStep("register");
  };

  const handleLoginSuccess = () => {
    toast({ title: "Welcome back!", description: "You've successfully signed in." });
    navigate(from);
  };

  const handleRegisterSuccess = () => {
    toast({ title: "Welcome!", description: "Your account has been created." });
    navigate(from);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="mb-8">
              <img src={logoFull} alt="Up2" className="h-16 w-auto mx-auto" />
            </div>
          </div>

          {step === "phone" && (
            <PhoneStep onPhoneChecked={handlePhoneChecked} />
          )}

          {step === "otp" && (
            <OtpStep
              phone={phone}
              onVerified={handleOtpVerified}
              onBack={() => setStep("phone")}
            />
          )}

          {step === "password" && (
            <PasswordStep
              phone={phone}
              onSuccess={handleLoginSuccess}
              onBack={() => setStep("phone")}
              onForgotPassword={() => {
                // Future: forgot password flow via OTP
                toast({ title: "Coming soon", description: "Password reset via SMS is coming soon." });
              }}
            />
          )}

          {step === "register" && (
            <RegisterStep
              phone={phone}
              onSuccess={handleRegisterSuccess}
              onBack={() => setStep("otp")}
            />
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
                navigate(from);
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
