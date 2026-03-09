import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent } from "@/hooks/useEventsQuery";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFriendsGoing } from "@/hooks/useFriendsGoing";

interface GuestWithProfile {
  id: string;
  userId: string;
  status: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

function useEventGuests(eventId: string | undefined) {
  return useQuery({
    queryKey: ['events', 'guests', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rsvps')
        .select('id, user_id, status, profiles!rsvps_user_id_fkey(display_name, username, avatar_url)')
        .eq('event_id', eventId!);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        status: r.status,
        displayName: r.profiles?.display_name || null,
        username: r.profiles?.username || null,
        avatarUrl: r.profiles?.avatar_url || null,
      })) as GuestWithProfile[];
    },
    enabled: !!eventId,
  });
}

const statusColors: Record<string, string> = {
  going: "bg-green-500/10 text-green-600 border-green-500/20",
  maybe: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  pending: "bg-muted text-muted-foreground",
};

const EventGuests = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event } = useEvent(id);
  const { data: guests = [], isLoading } = useEventGuests(id);
  const { data: friendsGoing = [] } = useFriendsGoing(id);
  const friendIds = new Set(friendsGoing.map(f => f.userId));

  const isHost = event && user && event.hostId === user.id;
  const goingCount = guests.filter(g => g.status === 'going').length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Guest List</h1>
            <p className="text-xs text-muted-foreground">{goingCount} going</p>
          </div>
        </div>
      </header>

      <main className="pt-4 md:pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="hidden md:block mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1 text-center">Guest List</h1>
            <p className="text-muted-foreground">{event?.title} • {goingCount} going</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="h-12 w-12 rounded-full bg-secondary animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
                    <div className="h-3 w-20 bg-secondary rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : guests.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No guests yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {guests.map(guest => (
                <div
                  key={guest.id}
                  className={`flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer ${friendIds.has(guest.userId) ? 'bg-primary/5 border border-primary/10' : ''}`}
                  onClick={() => navigate(`/user/${guest.userId}`)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={guest.avatarUrl || ""} />
                    <AvatarFallback className="bg-card text-foreground font-semibold text-sm">
                      {(guest.displayName || guest.username || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{guest.displayName || guest.username || "User"}</p>
                      {friendIds.has(guest.userId) && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Friend</Badge>
                      )}
                    </div>
                    {guest.username && <p className="text-sm text-muted-foreground">@{guest.username}</p>}
                  </div>
                  <Badge variant="outline" className={statusColors[guest.status] || statusColors.pending}>
                    {guest.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default EventGuests;
