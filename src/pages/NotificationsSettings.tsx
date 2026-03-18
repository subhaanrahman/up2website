import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";

const settingsConfig = [
  { id: "push_notifications", label: "Push Notifications", description: "Receive push notifications on your device" },
  { id: "email_notifications", label: "Email Notifications", description: "Get updates via email" },
  { id: "event_reminders", label: "Event Reminders", description: "Reminders before events you're attending" },
  { id: "friend_activity", label: "Friend Activity", description: "When friends RSVP or interact with events" },
  { id: "new_events", label: "New Events", description: "Notifications about new events from followed hosts" },
  { id: "promotions", label: "Promotions & Updates", description: "Special offers and app updates" },
  { id: "messages", label: "Direct Messages", description: "When someone sends you a message" },
  { id: "mentions", label: "Mentions", description: "When someone mentions you in a comment" },
] as const;

const NotificationsSettings = () => {
  const navigate = useNavigate();
  const { settings, loading, updateSetting } = useNotificationSettings();

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
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
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

export default NotificationsSettings;
