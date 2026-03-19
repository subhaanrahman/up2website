import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from '@/infrastructure/supabase';

interface CollaboratorPickerProps {
  currentUserId: string;
  excludeIds: string[];
  onSelect: (user: { user_id: string; display_name: string; avatar_url: string | null }) => void;
  onClose: () => void;
}

const CollaboratorPicker = ({ currentUserId, excludeIds, onSelect, onClose }: CollaboratorPickerProps) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ user_id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]>([]);

  useEffect(() => {
    const fetchFriends = async () => {
      // Get accepted connections
      const { data: connections } = await supabase
        .from("connections")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      if (!connections || connections.length === 0) {
        setResults([]);
        return;
      }

      const friendIds = connections
        .map(c => c.requester_id === currentUserId ? c.addressee_id : c.requester_id)
        .filter(id => !excludeIds.includes(id));

      if (friendIds.length === 0) { setResults([]); return; }

      let query = supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", friendIds);

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`display_name.ilike.${term},username.ilike.${term}`);
      }

      const { data } = await query.limit(10);
      setResults(data || []);
    };

    fetchFriends();
  }, [currentUserId, excludeIds, search]);

  return (
    <div className="mt-2 border border-border rounded-tile-sm bg-card p-2 max-h-48 overflow-y-auto">
      <Input
        placeholder="Search friends..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-8 text-[13px] mb-2"
        autoFocus
      />
      {results.length === 0 && (
        <p className="text-[13px] text-muted-foreground text-center py-2">No friends found</p>
      )}
      {results.map(r => (
        <button
          key={r.user_id}
          onClick={() => onSelect({ user_id: r.user_id, display_name: r.display_name || r.username || "User", avatar_url: r.avatar_url })}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-secondary text-left"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={r.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-muted">{(r.display_name || "U")[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[13px] text-foreground font-medium truncate">{r.display_name || r.username}</p>
            {r.username && <p className="text-[11px] text-muted-foreground truncate">@{r.username}</p>}
          </div>
        </button>
      ))}
    </div>
  );
};

export default CollaboratorPicker;
