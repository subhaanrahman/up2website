import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";

const REMINDER_OPTIONS = [
  { value: "1_week", label: "1 week before" },
  { value: "1_day", label: "1 day before" },
  { value: "2_hours", label: "2 hours before" },
];

interface NotificationsPanelProps {
  reminders: string[];
  setReminders: (v: string[]) => void;
}

const NotificationsPanel = ({ reminders, setReminders }: NotificationsPanelProps) => {
  const toggle = (value: string) => {
    setReminders(
      reminders.includes(value)
        ? reminders.filter((r) => r !== value)
        : [...reminders, value]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-200">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="h-4 w-4 text-primary" />
        <Label className="text-foreground font-medium">Auto Reminders</Label>
      </div>
      <p className="text-xs text-muted-foreground -mt-4">
        Select which push notification reminders to send to attendees
      </p>

      {REMINDER_OPTIONS.map((opt) => (
        <div key={opt.value} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
          <Label className="text-foreground text-sm">{opt.label}</Label>
          <Switch checked={reminders.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
        </div>
      ))}
    </div>
  );
};

export default NotificationsPanel;
