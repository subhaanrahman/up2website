import { Switch } from "@/components/ui/switch";

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
    setReminders(reminders.includes(value) ? reminders.filter((r) => r !== value) : [...reminders, value]);
  };

  return (
    <div className="space-y-3 animate-in fade-in-0 duration-200">
      <div className="bg-card rounded-tile border border-border/50 overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Auto Reminders</p>
          <p className="text-xs text-muted-foreground mt-1">Push notifications sent to attendees</p>
        </div>
        {REMINDER_OPTIONS.map((opt, i) => (
          <div key={opt.value}>
            <div className="h-px bg-border/50 mx-4" />
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-[15px] font-medium text-foreground">{opt.label}</p>
              <Switch checked={reminders.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPanel;
