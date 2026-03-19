import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logoFull from "@/assets/logo-full.png";
import PhoneStep from "@/components/auth/PhoneStep";
import OtpStep from "@/components/auth/OtpStep";
import RegisterStep from "@/components/auth/RegisterStep";
import { Button } from "@/components/ui/button";

type AuthStep = "phone" | "otp" | "register";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/profile";
  const { user, devLogin } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  // Redirect if already logged in
  if (user) {
    return <Navigate to={from} replace />;
  }

  const handlePhoneChecked = (phoneNumber: string, exists: boolean) => {
    setPhone(phoneNumber);
    setIsNewUser(!exists);
    setStep("otp");
  };

  const handleOtpVerified = () => {
    // New users complete profile details after OTP verification.
    if (isNewUser) setStep("register");
  };

  const handleRegisterSuccess = () => {
    toast({ title: "Welcome!", description: "Your account has been created." });
    navigate(from);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="mb-8">
              <img src={logoFull} alt="Up2" className="h-16 w-auto mx-auto" />
            </div>
          </div>

          {step === "phone" && (
            <>
              <PhoneStep onPhoneChecked={handlePhoneChecked} />
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Skip for now →
              </button>
            </>
          )}

          {step === "otp" && (
            <OtpStep
              phone={phone}
              isReturningUser={!isNewUser}
              onVerified={handleOtpVerified}
              onBack={() => setStep("phone")}
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
            By signing in, you agree to our{" "}
            <a href="/terms" className="underline text-primary">Terms of Service</a>{" "}
            and{" "}
            <a href="/privacy" className="underline text-primary">Privacy Policy</a>.
          </p>

          {/* Dev Login Buttons */}
          <div className="mt-8 pt-8 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-2">🔧 Dev Login</p>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const { error } = await devLogin("1eafb563-071a-45c6-a82e-79b460b3a851");
                if (error) {
                  const msg = /failed to fetch|network error/i.test(error.message)
                    ? `${error.message}. Deploy the dev-login function: supabase functions deploy dev-login`
                    : error.message;
                  toast({ title: "Dev login failed", description: msg, variant: "destructive" });
                }
              }}
              className="w-full"
            >
              Dylan
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const { error } = await devLogin("e8f02149-2ccf-4324-950a-d2a574c46569");
                if (error) {
                  const msg = /failed to fetch|network error/i.test(error.message)
                    ? `${error.message}. Deploy the dev-login function: supabase functions deploy dev-login`
                    : error.message;
                  toast({ title: "Dev login failed", description: msg, variant: "destructive" });
                }
              }}
              className="w-full"
            >
              Haan
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const { error } = await devLogin("e8f02149-2ccf-4324-950a-d2a574c46569");
                if (!error) {
                  localStorage.setItem("active_profile", JSON.stringify({
                    id: "6348b9db-fd8a-466e-8549-6c4333cdfa56",
                    type: "organiser",
                    displayName: "Members Only",
                    avatarUrl: null,
                  }));
                } else {
                  const msg = /failed to fetch|network error/i.test(error.message)
                    ? `${error.message}. Deploy the dev-login function: supabase functions deploy dev-login`
                    : error.message;
                  toast({ title: "Dev login failed", description: msg, variant: "destructive" });
                }
              }}
              className="w-full"
            >
              Haan → Members Only
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
