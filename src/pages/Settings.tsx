import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Music, 
  Shield, 
  HelpCircle, 
  Mail, 
  Info,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Sparkles,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { profileApi } from "@/api";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { profileKeys } from "@/hooks/useProfileQuery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const settingsItems = [
  { icon: SettingsIcon, label: "Manage Account", path: "/settings/account", description: "Account settings and preferences" },
  { icon: Bell, label: "Notifications", path: "/settings/notifications", description: "Manage notification preferences" },
  { icon: ShieldCheck, label: "Email Verification", path: "/settings/email-verification", description: "Verify your email for extra security" },
  { icon: CreditCard, label: "Payment Methods", path: "/settings/payment-methods", description: "Manage saved payment methods" },
  { icon: Music, label: "Connect Music Apps", path: "/settings/music", description: "Link your music streaming services" },
  { icon: Shield, label: "Privacy Options", path: "/settings/privacy", description: "Control your privacy settings" },
  { icon: HelpCircle, label: "Help Center", path: "/settings/help", description: "FAQs and support resources" },
  { icon: Mail, label: "Contact Us", path: "/settings/contact", description: "Get in touch with our team" },
  { icon: Info, label: "About", path: "/settings/about", description: "Learn more about the app" },
];

const PROFESSIONAL_CLASSIFICATIONS = ["DJ", "Artist", "Promoter"] as const;

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState<string>("");
  const [upgrading, setUpgrading] = useState(false);

  const isProfessional = profile?.profileTier === "professional";

  const handleUpgrade = async () => {
    if (!selectedClassification || !user) return;
    setUpgrading(true);
    try {
      await profileApi.update({
        profile_tier: "professional",
        page_classification: selectedClassification,
      });
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.id) });
      toast({ title: "Upgraded!", description: `Your profile is now a public ${selectedClassification} account.` });
      setUpgradeOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to upgrade profile.", variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      await profileApi.update({
        profile_tier: "personal",
        page_classification: null,
      });
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.id) });
      toast({ title: "Downgraded", description: "Your profile is now a private personal account." });
    } catch {
      toast({ title: "Error", description: "Failed to downgrade profile.", variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
       {/* Header */}
       <header className="sticky top-0 z-40 bg-background border-b border-border">
         <div className="flex items-center justify-center px-4 py-4 relative">
           <h1 className="text-xl font-bold text-foreground text-center">SETTINGS</h1>
           <button onClick={() => navigate(-1)} className="absolute left-2 p-2 -ml-2">
             <ArrowLeft className="h-6 w-6 text-foreground" />
           </button>
         </div>
       </header>

      <main className="px-4 pt-4">
        {/* Upgrade / Downgrade Professional */}
        {profile && (
          <button
            onClick={() => isProfessional ? handleDowngrade() : setUpgradeOpen(true)}
            disabled={upgrading}
            className="w-full flex items-center gap-4 p-4 rounded-xl mb-2 bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-foreground">
                {isProfessional ? "Professional Account" : "Upgrade to Professional"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {isProfessional
                  ? `Public ${profile.pageClassification || ""} profile · Tap to downgrade`
                  : "Get a public profile as a DJ, Artist, or Promoter"}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </button>
        )}

        <div className="space-y-1">
          {settingsItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-secondary transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <item.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Version Number */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
        </div>
      </main>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to Professional</DialogTitle>
            <DialogDescription>
              Make your profile public and let anyone follow you. Choose your classification below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Classification</Label>
              <Select value={selectedClassification} onValueChange={setSelectedClassification}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your type" />
                </SelectTrigger>
                <SelectContent>
                  {PROFESSIONAL_CLASSIFICATIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleUpgrade}
              disabled={!selectedClassification || upgrading}
              className="w-full"
            >
              {upgrading ? "Upgrading..." : "Upgrade"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Settings;