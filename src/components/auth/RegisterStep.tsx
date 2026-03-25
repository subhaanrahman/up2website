import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  FormFieldCard,
  FormFieldDivider,
  FormFieldLabel,
  formFlowInputClass,
  formFlowPrimaryButtonClass,
} from "@/components/form-flow/FormFlowLayout";
import { cn } from "@/lib/utils";

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
  const isFormValid = Boolean(displayName.trim() && isUsernameValid);

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
        <h1 className="text-lg font-bold text-foreground mb-2 tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Phone verified — set your public name and username.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormFieldCard>
          <div className="px-4 pt-4 pb-3">
            <FormFieldLabel>Display name</FormFieldLabel>
            <input
              id="displayName"
              type="text"
              placeholder="How your name appears"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={formFlowInputClass}
              disabled={loading}
              autoComplete="name"
            />
          </div>
          <FormFieldDivider />
          <div className="px-4 pt-3 pb-4">
            <FormFieldLabel>Username</FormFieldLabel>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-[15px]">@</span>
              <input
                id="username"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30))}
                className={cn(formFlowInputClass, "flex-1")}
                disabled={loading}
                autoComplete="username"
              />
            </div>
            {username && !isUsernameValid ? (
              <p className="text-xs text-destructive mt-2">3–30 characters: letters, numbers, underscores.</p>
            ) : null}
          </div>
        </FormFieldCard>

        {error ? <p className="text-sm text-destructive px-1">{error}</p> : null}

        <Button type="submit" className={cn(formFlowPrimaryButtonClass, "gap-2")} disabled={loading || !isFormValid}>
          {loading ? (
            "CREATING…"
          ) : (
            <>
              Create account <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>

        <Button type="button" variant="ghost" onClick={onBack} className="w-full text-muted-foreground">
          Back
        </Button>
      </form>
    </>
  );
};

export default RegisterStep;
