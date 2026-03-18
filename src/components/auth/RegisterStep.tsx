import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PASSWORD_RULES } from "@/utils/passwordValidation";

interface RegisterStepProps {
  phone: string;
  onSuccess: () => void;
  onBack: () => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const RegisterStep = ({ phone, onSuccess, onBack }: RegisterStepProps) => {
  const { register } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allPasswordRulesPass = PASSWORD_RULES.every((r) => r.test(password));
  const isUsernameValid = USERNAME_REGEX.test(username);
  const isFormValid = firstName.trim() && lastName.trim() && isUsernameValid && allPasswordRulesPass;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isFormValid) {
      setError("Please fill in all fields correctly");
      return;
    }

    setLoading(true);

    const { error: regErr } = await register({
      phone,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.toLowerCase(),
    });

    if (regErr) {
      setError(regErr.message);
      toast({ title: "Error", description: regErr.message, variant: "destructive" });
    } else {
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
        <p className="text-muted-foreground">
          Phone verified! Set up your profile to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-foreground">First name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="First"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-12 bg-card border-border"
              disabled={loading}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-foreground">Last name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-12 bg-card border-border"
              disabled={loading}
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="text-foreground">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="your_username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30))}
            className="h-12 bg-card border-border"
            disabled={loading}
            autoComplete="username"
          />
          {username && !isUsernameValid && (
            <p className="text-sm text-destructive">3-30 characters, letters, numbers, underscores only</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-foreground">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-card border-border pr-12"
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
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          className="w-full h-14 text-lg gap-2"
          disabled={loading || !isFormValid}
        >
          {loading ? "Creating account..." : (
            <>Create account <ArrowRight className="h-5 w-5" /></>
          )}
        </Button>

        <Button type="button" variant="ghost" onClick={onBack} className="w-full">
          Back
        </Button>
      </form>
    </>
  );
};

export default RegisterStep;
