import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/infrastructure/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logoFull from "@/assets/logo-full.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/utils/passwordValidation";

/**
 * Handles the email reset flow: Supabase redirects here after the user clicks
 * the link in their email. onAuthStateChange fires with PASSWORD_RECOVERY event.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const hasRecoveryHash = hashParams.get("type") === "recovery";

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setRecoveryReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && hasRecoveryHash) {
        setRecoveryReady(true);
      }
    });

    const t = setTimeout(() => {
      if (!hasRecoveryHash) {
        navigate("/auth", { replace: true });
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [navigate]);

  const allPasswordRulesPass = PASSWORD_RULES.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!allPasswordRulesPass) {
      setError("Password must meet all requirements");
      return;
    }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateErr) {
      setError(updateErr.message);
      toast({ title: "Error", description: updateErr.message, variant: "destructive" });
      return;
    }

    toast({ title: "Password updated", description: "You can now sign in with your new password." });
    navigate("/auth", { replace: true });
  };

  if (user && !recoveryReady) {
    return <Navigate to="/profile" replace />;
  }

  if (!recoveryReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <img src={logoFull} alt="Up2" className="h-16 w-auto mx-auto mb-6" />
          <h1 className="text-xl font-bold text-foreground mb-2">Loading...</h1>
          <p className="text-muted-foreground">
            If you were sent here from an email link, we&apos;re verifying it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <img src={logoFull} alt="Up2" className="h-16 w-auto mx-auto" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Set new password</h1>
          <p className="text-muted-foreground">
            Enter a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {password && (
              <div className="space-y-1 mt-2">
                {PASSWORD_RULES.map((rule) => {
                  const passes = rule.test(password);
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full h-14 text-lg" disabled={loading || !allPasswordRulesPass}>
            {loading ? "Updating..." : "Reset password"}
          </Button>
        </form>

        <Button
          type="button"
          variant="ghost"
          className="w-full mt-4"
          onClick={() => navigate("/auth")}
        >
          Back to sign in
        </Button>
      </div>
    </div>
  );
};

export default ResetPassword;
