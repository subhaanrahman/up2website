import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PrivacySettings {
  go_public: boolean;
  share_saved_events: boolean;
  share_going_events: boolean;
}

const defaultSettings: PrivacySettings = {
  go_public: true,
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
          go_public: data.go_public,
          share_saved_events: data.share_saved_events,
          share_going_events: data.share_going_events,
        });
      }
      setLoading(false);
    };

    fetchSettings();

    // Subscribe to realtime updates
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
              go_public: newData.go_public,
              share_saved_events: newData.share_saved_events,
              share_going_events: newData.share_going_events,
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

    const { data: existing } = await supabase
      .from("privacy_settings")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let error;
    if (existing) {
      const result = await supabase
        .from("privacy_settings")
        .update({ [key]: value })
        .eq("user_id", user.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("privacy_settings")
        .insert({ user_id: user.id, ...newSettings });
      error = result.error;
    }

    if (error) {
      console.error("Error updating privacy settings:", error);
      toast({
        title: "Error",
        description: "Failed to save privacy settings",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Privacy updated",
      description: "Your privacy preferences have been saved",
    });
  };

  return { settings, loading, updateSetting };
};
