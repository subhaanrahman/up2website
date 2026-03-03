import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PasswordStepProps {
  phone: string;
  onSuccess: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
}

const PasswordStep = ({ phone, onSuccess, onBack, onForgotPassword }: PasswordStepProps) => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);

    const { error: loginErr } = await login(phone, password);

    if (loginErr) {
      setError(loginErr.message);
      toast({ title: "Error", description: loginErr.message, variant: "destructive" });
    } else {
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
        <p className="text-muted-foreground">
          Enter your password for <span className="font-medium text-foreground">{phone}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-foreground">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 bg-card border-border pr-12"
              disabled={loading}
              autoComplete="current-password"
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button type="submit" className="w-full h-14 text-lg gap-2" disabled={loading || !password}>
          {loading ? "Signing in..." : (
            <>Sign in <ArrowRight className="h-5 w-5" /></>
          )}
        </Button>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
            Different number
          </Button>
          <Button type="button" variant="ghost" onClick={onForgotPassword} className="flex-1">
            Forgot password?
          </Button>
        </div>
      </form>
    </>
  );
};

export default PasswordStep;
