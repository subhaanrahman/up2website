import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { supabase } from '@/infrastructure/supabase';
import { useAuth } from "@/contexts/AuthContext";

const SPOTIFY_SCOPES = "user-read-currently-playing user-top-read user-read-playback-state";

const generateCodeVerifier = (): string => {
  const array = new Uint8Array(64);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

interface MusicService {
  id: string;
  name: string;
  description: string;
  bgClass: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

const AppleMusicIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
    <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208A5.495 5.495 0 00.05 5.08a60.26 60.26 0 00-.05 1.063v11.717c.01.5.04 1 .12 1.496.166 1.077.617 2.014 1.37 2.792.88.908 1.97 1.39 3.21 1.55.49.063.98.09 1.474.1H18.9c.508-.012 1.015-.045 1.517-.12 1.054-.167 1.973-.622 2.73-1.368.906-.882 1.386-1.97 1.55-3.21.064-.49.09-.982.1-1.473V7.15c-.009-.34-.024-.68-.05-1.02l-.004-.007zm-6.54 3.17v6.61c0 .303-.074.585-.235.837-.222.345-.54.556-.938.63a1.604 1.604 0 01-1.748-.851 1.6 1.6 0 01-.162-.733v-.01c.013-.867.733-1.573 1.604-1.573.234 0 .454.05.657.142V5.928l-5.555 1.328v7.484c0 .289-.065.563-.21.81-.22.376-.547.6-.975.667a1.6 1.6 0 01-1.735-.857 1.594 1.594 0 01-.148-.666c.01-.87.733-1.574 1.604-1.574.23 0 .447.047.645.134V5.264c0-.404.272-.757.666-.857l6.84-1.637c.52-.124 1.027.26 1.027.794v5.73h-.337z" />
  </svg>
);

const ConnectMusic = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const services: MusicService[] = [
    {
      id: "spotify",
      name: "Spotify",
      description: "Connect your Spotify account to share what you're listening to",
      bgClass: "bg-[#1DB954]",
      icon: <SpotifyIcon />,
    },
    {
      id: "apple-music",
      name: "Apple Music",
      description: "Link your Apple Music library and playlists",
      bgClass: "bg-gradient-to-br from-pink-600 to-red-600",
      icon: <AppleMusicIcon />,
      comingSoon: true,
    },
  ];

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_music_connections")
      .select("service_id, connected")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const state: Record<string, boolean> = {};
        data?.forEach((row: any) => { state[row.service_id] = row.connected; });
        setConnected(state);
        setLoading(false);
      });
  }, [user]);

  const handleConnectSpotify = async () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      toast({
        title: "Spotify not configured",
        description: "Spotify integration is not yet available. Check back soon.",
        variant: "destructive",
      });
      return;
    }
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem("spotify_code_verifier", verifier);

    const redirectUri = `${window.location.origin}/settings/music/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge,
      scope: SPOTIFY_SCOPES,
      state: "spotify",
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  const handleDisconnect = async (serviceId: string) => {
    if (!user) return;
    setDisconnecting(serviceId);
    try {
      const { error } = await supabase
        .from("user_music_connections")
        .upsert(
          { user_id: user.id, service_id: serviceId, connected: false },
          { onConflict: "user_id,service_id" }
        );
      if (error) throw error;
      setConnected((prev) => ({ ...prev, [serviceId]: false }));
      toast({ title: `${services.find((s) => s.id === serviceId)?.name} disconnected` });
    } catch {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Connect Music</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Link your music streaming services to share your taste and discover what friends are listening to at events.
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-9 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          services.map((service) => {
            const isConnected = !!connected[service.id];
            return (
              <div
                key={service.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
              >
                <div className={`h-12 w-12 rounded-xl ${service.bgClass} flex items-center justify-center flex-shrink-0`}>
                  {service.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{service.name}</p>
                    {service.comingSoon && (
                      <Badge variant="secondary" className="text-[10px]">Soon</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {service.comingSoon ? (
                    <Button size="sm" variant="outline" className="rounded-full text-xs" disabled>
                      Connect
                    </Button>
                  ) : isConnected ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">Connected</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-xs text-muted-foreground"
                        disabled={disconnecting === service.id}
                        onClick={() => handleDisconnect(service.id)}
                      >
                        {disconnecting === service.id ? "···" : "Disconnect"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-full text-xs font-bold tracking-wide"
                      onClick={service.id === "spotify" ? handleConnectSpotify : undefined}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Requires <span className="font-medium">VITE_SPOTIFY_CLIENT_ID</span> environment variable to enable Spotify.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default ConnectMusic;
