import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const NotificationsSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [settings, setSettings] = useState<NotificationSetting[]>([
    { id: "push", label: "Push Notifications", description: "Receive push notifications on your device", enabled: true },
    { id: "email", label: "Email Notifications", description: "Get updates via email", enabled: true },
    { id: "event_reminders", label: "Event Reminders", description: "Reminders before events you're attending", enabled: true },
    { id: "friend_activity", label: "Friend Activity", description: "When friends RSVP or interact with events", enabled: true },
    { id: "new_events", label: "New Events", description: "Notifications about new events from followed hosts", enabled: false },
    { id: "promotions", label: "Promotions & Updates", description: "Special offers and app updates", enabled: false },
    { id: "messages", label: "Direct Messages", description: "When someone sends you a message", enabled: true },
    { id: "mentions", label: "Mentions", description: "When someone mentions you in a comment", enabled: true },
  ]);

  const toggleSetting = (id: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
    toast({
      title: "Settings updated",
      description: "Your notification preferences have been saved",
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
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
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

export default NotificationsSettings;
