import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { settingsApi } from "@/api";

interface NotificationSettings {
  push_notifications: boolean;
  email_notifications: boolean;
  event_reminders: boolean;
  friend_activity: boolean;
  new_events: boolean;
  promotions: boolean;
  messages: boolean;
  mentions: boolean;
}

const defaultSettings: NotificationSettings = {
  push_notifications: true,
  email_notifications: true,
  event_reminders: true,
  friend_activity: true,
  new_events: false,
  promotions: false,
  messages: true,
  mentions: true,
};

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching notification settings:", error);
      }

      if (data) {
        setSettings({
          push_notifications: data.push_notifications,
          email_notifications: data.email_notifications,
          event_reminders: data.event_reminders,
          friend_activity: data.friend_activity,
          new_events: data.new_events,
          promotions: data.promotions,
          messages: data.messages,
          mentions: data.mentions,
        });
      }
      setLoading(false);
    };

    fetchSettings();

    const channel = supabase
      .channel("notification_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_settings",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const newData = payload.new as NotificationSettings & { user_id: string };
            setSettings({
              push_notifications: newData.push_notifications,
              email_notifications: newData.email_notifications,
              event_reminders: newData.event_reminders,
              friend_activity: newData.friend_activity,
              new_events: newData.new_events,
              promotions: newData.promotions,
              messages: newData.messages,
              mentions: newData.mentions,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await settingsApi.upsertNotifications(newSettings);
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved",
      });
    } catch (err) {
      console.error("Error updating notification settings:", err);
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      });
    }
  };

  return { settings, loading, updateSetting };
};
