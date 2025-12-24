import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

interface PrivacySetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const PrivacySettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [settings, setSettings] = useState<PrivacySetting[]>([
    { 
      id: "go_public", 
      label: "Go Public", 
      description: "Make your profile visible to everyone", 
      enabled: true 
    },
    { 
      id: "share_saved", 
      label: "Share Saved Events", 
      description: "Let others see events you've saved", 
      enabled: false 
    },
    { 
      id: "share_going", 
      label: "Share Going Events", 
      description: "Let others see events you're attending", 
      enabled: true 
    },
  ]);

  const toggleSetting = (id: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
    toast({
      title: "Privacy updated",
      description: "Your privacy preferences have been saved",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Privacy Options</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        <p className="text-muted-foreground text-sm mb-6">
          Control who can see your activity and profile information.
        </p>

        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="flex items-center justify-between p-4 bg-card rounded-xl"
            >
              <div className="flex-1 mr-4">
                <Label htmlFor={setting.id} className="text-foreground font-medium cursor-pointer">
                  {setting.label}
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {setting.description}
                </p>
              </div>
              <Switch
                id={setting.id}
                checked={setting.enabled}
                onCheckedChange={() => toggleSetting(setting.id)}
              />
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PrivacySettings;
