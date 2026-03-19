import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface RegisterStepProps {
  phone: string;
  onSuccess: () => void;
  onBack: () => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const RegisterStep = ({ phone, onSuccess, onBack }: RegisterStepProps) => {
  const { register } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isUsernameValid = USERNAME_REGEX.test(username);
  const isFormValid = displayName.trim() && isUsernameValid;

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
      displayName: displayName.trim(),
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
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-foreground">Display name</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="How your name appears"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-12 bg-card border-border"
            disabled={loading}
            autoComplete="name"
          />
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
