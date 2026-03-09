import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/infrastructure/supabase";
import { settingsApi } from "@/api";

interface PrivacySettings {
  share_saved_events: boolean;
  share_going_events: boolean;
}

const defaultSettings: PrivacySettings = {
  share_saved_events: false,
  share_going_events: true,
};

export const usePrivacySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("privacy_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching privacy settings:", error);
      }

      if (data) {
        setSettings({
          share_saved_events: data.share_saved_events ?? false,
          share_going_events: data.share_going_events ?? true,
        });
      }
      setLoading(false);
    };

    fetchSettings();

    const channel = supabase
      .channel("privacy_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "privacy_settings",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const newData = payload.new as PrivacySettings & { user_id: string };
            setSettings({
              share_saved_events: newData.share_saved_events ?? false,
              share_going_events: newData.share_going_events ?? true,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await settingsApi.upsertPrivacy(newSettings);
      toast({
        title: "Privacy updated",
        description: "Your privacy preferences have been saved",
      });
    } catch (err) {
      console.error("Error updating privacy settings:", err);
      toast({
        title: "Error",
        description: "Failed to save privacy settings",
        variant: "destructive",
      });
    }
  };

  return { settings, loading, updateSetting };
};