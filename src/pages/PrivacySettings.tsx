import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";

const settingsConfig = [
  { id: "share_saved_events", label: "Share Saved Events", description: "Let others see events you've saved" },
  { id: "share_going_events", label: "Share Going Events", description: "Let others see events you're attending" },
] as const;

const PrivacySettings = () => {
  const navigate = useNavigate();
  const { settings, loading, updateSetting } = usePrivacySettings();

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
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-card rounded-tile-sm">
                <div className="flex-1 mr-4">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))
          ) : (
            settingsConfig.map((setting) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-4 bg-card rounded-tile-sm"
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
                  checked={settings[setting.id]}
                  onCheckedChange={(checked) => updateSetting(setting.id, checked)}
                />
              </div>
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PrivacySettings;