import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/infrastructure/supabase";
import { PASSWORD_RULES } from "@/utils/passwordValidation";
import {
  FormFieldCard,
  FormFieldDivider,
  FormFieldLabel,
  FormFlowHeader,
  FormFlowMain,
  FormFlowScreen,
  formFlowPrimaryButtonClass,
} from "@/components/form-flow/FormFlowLayout";

const ManageAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const allPasswordRulesPass = PASSWORD_RULES.every((rule) => rule.test(newPassword));

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!allPasswordRulesPass) {
      toast({ title: "Password does not meet requirements", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password saved successfully" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Please try again.";
      toast({ title: "Failed to update password", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("account-delete");
      if (error) throw error;
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Please try again.";
      toast({ title: "Failed to delete account", description: msg, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <FormFlowScreen>
      <FormFlowHeader title="Account" onBack={() => navigate(-1)} balanceRight />
      <FormFlowMain withBottomNav>
        <div className="space-y-3">
          <FormFieldCard className="px-4 pt-4 pb-4">
            <FormFieldLabel>Email</FormFieldLabel>
            <p className="text-[15px] font-medium text-foreground">{user?.email || "Not set"}</p>
          </FormFieldCard>

          <FormFieldCard className="px-4 pt-4 pb-4">
            <FormFieldLabel>Phone</FormFieldLabel>
            <p className="text-[15px] font-medium text-foreground">{user?.phone || "Not set"}</p>
          </FormFieldCard>

          <div className="pt-2">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-2">Password (optional)</p>
            <p className="text-sm text-muted-foreground mb-3">
              Add a password for extra security. You can still sign in with phone verification.
            </p>
          </div>

          <FormFieldCard>
            <div className="px-4 pt-4 pb-3">
              <FormFieldLabel>Password</FormFieldLabel>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="h-auto min-h-0 border-0 bg-transparent px-0 py-0 text-[15px] font-medium shadow-none focus-visible:ring-0 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword ? (
                <div className="space-y-1 mt-3">
                  {PASSWORD_RULES.map((rule) => {
                    const passes = rule.test(newPassword);
                    return (
                      <div key={rule.label} className="flex items-center gap-2 text-xs">
                        {passes ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <span className={passes ? "text-muted-foreground" : "text-destructive"}>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <FormFieldDivider />
            <div className="px-4 pt-3 pb-4">
              <FormFieldLabel>Confirm password</FormFieldLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="h-auto min-h-0 border-0 bg-transparent px-0 py-0 text-[15px] font-medium shadow-none focus-visible:ring-0"
              />
            </div>
          </FormFieldCard>

          <Button
            type="button"
            onClick={handleChangePassword}
            disabled={!newPassword || !confirmPassword || !allPasswordRulesPass || saving}
            className={formFlowPrimaryButtonClass}
          >
            {saving ? "SAVING…" : "SAVE PASSWORD"}
          </Button>
        </div>

        <div className="mt-10 space-y-3">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-destructive">Danger zone</p>
          <p className="text-sm text-muted-foreground">
            Deleting your account is permanent. All your data will be removed.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className={formFlowPrimaryButtonClass}>
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. Your account and data will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? "Deleting…" : "Yes, delete my account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </FormFlowMain>

      <BottomNav />
    </FormFlowScreen>
  );
};

export default ManageAccount;
