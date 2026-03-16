import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/infrastructure/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";

interface Friend {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface CreateGroupChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateGroupChatModal = ({ open, onOpenChange }: CreateGroupChatModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Fetch accepted friends
  useEffect(() => {
    if (!open || !user) return;

    const fetchFriends = async () => {
      setLoadingFriends(true);
      const { data: connections } = await supabase
        .from("connections")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!connections || connections.length === 0) {
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      const friendIds = connections.map(c =>
        c.requester_id === user.id ? c.addressee_id : c.requester_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", friendIds);

      setFriends(profiles || []);
      setLoadingFriends(false);
    };

    fetchFriends();
  }, [open, user]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setName("");
      setSearch("");
      setSelectedIds(new Set());
    }
  }, [open]);

  const toggleFriend = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFriends = friends.filter(f => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      f.display_name?.toLowerCase().includes(term) ||
      f.username?.toLowerCase().includes(term)
    );
  });

  const handleCreate = async () => {
    if (!user || !name.trim() || selectedIds.size < 2) return;
    setCreating(true);
    try {
      const totalMembers = 1 + selectedIds.size;

      // 1. Create the group chat
      const { data: chat, error } = await supabase
        .from("group_chats")
        .insert({ name: name.trim(), member_count: totalMembers })
        .select()
        .single();

      if (error) throw error;

      // 2. Add creator as member first (needed for RLS to allow adding others)
      const { error: creatorError } = await supabase
        .from("group_chat_members")
        .insert({ group_chat_id: chat.id, user_id: user.id });

      if (creatorError) throw creatorError;

      // 3. Add selected friends as members
      if (selectedIds.size > 0) {
        const memberRows = Array.from(selectedIds).map(uid => ({
          group_chat_id: chat.id,
          user_id: uid,
        }));

        const { error: membersError } = await supabase
          .from("group_chat_members")
          .insert(memberRows);

        if (membersError) throw membersError;
      }

      queryClient.invalidateQueries({ queryKey: ["group-chats"] });
      toast({ title: "Group chat created!" });
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to create group", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Group Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label htmlFor="chat-name">Group Name</Label>
            <Input
              id="chat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              maxLength={100}
            />
          </div>

          {/* Friend picker */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col min-h-0">
            <Label>Add Friends</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search friends..."
                className="pl-8 h-9 text-[13px]"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0 max-h-52">
              {loadingFriends && (
                <p className="text-[13px] text-muted-foreground text-center py-4">Loading...</p>
              )}
              {!loadingFriends && filteredFriends.length === 0 && (
                <p className="text-[13px] text-muted-foreground text-center py-4">
                  {friends.length === 0 ? "No friends yet" : "No results"}
                </p>
              )}
              {filteredFriends.map(f => (
                <button
                  key={f.user_id}
                  type="button"
                  onClick={() => toggleFriend(f.user_id)}
                  className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-secondary text-left"
                >
                  <Checkbox checked={selectedIds.has(f.user_id)} className="pointer-events-none" />
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={f.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {(f.display_name || f.username || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-[13px] text-foreground font-medium truncate">
                      {f.display_name || f.username || "User"}
                    </p>
                    {f.username && (
                      <p className="text-[11px] text-muted-foreground truncate">@{f.username}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {selectedIds.size > 0 && (
              <p className="text-[12px] text-muted-foreground">
                {selectedIds.size} friend{selectedIds.size !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <Button
            onClick={handleCreate}
            disabled={!name.trim() || selectedIds.size < 2 || creating}
            className="w-full"
          >
            {creating ? "Creating…" : `Create Group (${1 + selectedIds.size} members)`}
          </Button>
          {selectedIds.size < 2 && selectedIds.size > 0 && (
            <p className="text-[11px] text-muted-foreground text-center">
              Select at least 2 friends — group chats need 3+ people
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupChatModal;
