import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const MusicCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const service = params.get("state") || "spotify";

    if (error || !code) {
      toast({ title: "Connection cancelled", variant: "destructive" });
      navigate("/settings/music");
      return;
    }

    const exchangeSpotifyToken = async () => {
      const verifier = sessionStorage.getItem("spotify_code_verifier");
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

      if (!verifier || !clientId || !user) {
        navigate("/settings/music");
        return;
      }

      const redirectUri = `${window.location.origin}/settings/music/callback`;
      const body = new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code: code!,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      try {
        const res = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        if (res.ok) {
          sessionStorage.removeItem("spotify_code_verifier");
          // Mark as connected in DB (token columns may or may not exist)
          await supabase
            .from("user_music_connections")
            .upsert(
              { user_id: user.id, service_id: "spotify", connected: true },
              { onConflict: "user_id,service_id" }
            );
          toast({ title: "Spotify connected!" });
        } else {
          toast({ title: "Failed to connect Spotify", variant: "destructive" });
        }
      } catch {
        toast({ title: "Connection error", variant: "destructive" });
      }

      navigate("/settings/music");
    };

    if (service === "spotify") {
      exchangeSpotifyToken();
    } else {
      navigate("/settings/music");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Connecting your music account…</p>
    </div>
  );
};

export default MusicCallback;
