import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { supabase } from '@/infrastructure/supabase';
import { PASSWORD_RULES } from "@/utils/passwordValidation";

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
    } catch (err: any) {
      toast({ title: "Failed to update password", description: err?.message || "Please try again.", variant: "destructive" });
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
    } catch (err: any) {
      toast({ title: "Failed to delete account", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Manage Account</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-8">
        {/* Email display */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Email</Label>
          <p className="text-foreground font-medium">{user?.email || "Not set"}</p>
        </div>

        {/* Phone display */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Phone</Label>
          <p className="text-foreground font-medium">{user?.phone || "Not set"}</p>
        </div>

        <Separator />

        {/* Password setup */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Password (Optional)</h2>
          <p className="text-sm text-muted-foreground">
            Add a password for extra security. Your account can still be accessed with phone verification codes.
          </p>

          <div className="space-y-2">
            <Label htmlFor="new-password">Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="space-y-1 mt-2">
                {PASSWORD_RULES.map((rule) => {
                  const passes = rule.test(newPassword);
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

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={!newPassword || !confirmPassword || !allPasswordRulesPass || saving}
            className="w-full"
          >
            {saving ? "Saving…" : "Save Password"}
          </Button>
        </div>

        <Separator />

        {/* Delete account */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Deleting your account is permanent and cannot be undone. All your data will be removed.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? "Deleting…" : "Yes, delete my account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ManageAccount;
