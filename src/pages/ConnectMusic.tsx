import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Music } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

interface MusicService {
  id: string;
  name: string;
  description: string;
  color: string;
}

const services: MusicService[] = [
  { id: "spotify", name: "Spotify", description: "Connect your Spotify account to share what you're listening to", color: "bg-[hsl(141,73%,42%)]" },
  { id: "apple-music", name: "Apple Music", description: "Link your Apple Music library and playlists", color: "bg-[hsl(0,0%,0%)]" },
];

const ConnectMusic = () => {
  const navigate = useNavigate();
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const toggleService = (id: string) => {
    const next = !connected[id];
    setConnected((prev) => ({ ...prev, [id]: next }));
    toast({
      title: next
        ? `${services.find((s) => s.id === id)?.name} connected`
        : `${services.find((s) => s.id === id)?.name} disconnected`,
    });
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

        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
          >
            <div className={`h-12 w-12 rounded-xl ${service.color} flex items-center justify-center`}>
              <Music className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{service.name}</p>
              <p className="text-xs text-muted-foreground">{service.description}</p>
            </div>
            <Switch
              checked={!!connected[service.id]}
              onCheckedChange={() => toggleService(service.id)}
            />
          </div>
        ))}
      </main>

      <BottomNav />
    </div>
  );
};

export default ConnectMusic;
