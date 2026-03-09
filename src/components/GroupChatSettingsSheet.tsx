import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Pencil,
  UserPlus,
  LogOut,
  Check,
  X,
  Search,
  Crown,
  UserMinus,
} from "lucide-react";
import { getOptimizedUrl } from "@/lib/imageUtils";
import { Checkbox } from "@/components/ui/checkbox";

interface GroupChatSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  chatName: string;
  memberCount: number;
}

interface MemberProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Friend {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const GroupChatSettingsSheet = ({
  open,
  onOpenChange,
  chatId,
  chatName,
  memberCount,
}: GroupChatSettingsSheetProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(chatName);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Fetch members
  const { data: members = [] } = useQuery({
    queryKey: ["group-chat-members", chatId],
    queryFn: async (): Promise<MemberProfile[]> => {
      const { data, error } = await supabase.rpc("get_group_chat_member_profiles", {
        p_group_chat_id: chatId,
      });
      if (error) {
        console.error("Failed to fetch group members:", error);
        return [];
      }
      return (data as MemberProfile[]) || [];
    },
    enabled: open,
  });

  // Fetch friends for adding (excluding existing members)
  const { data: availableFriends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["group-chat-available-friends", chatId],
    queryFn: async (): Promise<Friend[]> => {
      if (!user) return [];

      const { data: connections } = await supabase
        .from("connections")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!connections || connections.length === 0) return [];

      const friendIds = connections.map((c) =>
        c.requester_id === user.id ? c.addressee_id : c.requester_id
      );

      // Exclude existing members
      const memberIds = members.map((m) => m.user_id);
      const newFriendIds = friendIds.filter((id) => !memberIds.includes(id));

      if (newFriendIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", newFriendIds);

      return (profiles as Friend[]) || [];
    },
    enabled: open && showAddMembers,
  });

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === chatName) {
      setIsEditing(false);
      setNewName(chatName);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("group_chats")
      .update({ name: newName.trim() })
      .eq("id", chatId);

    if (error) {
      toast({ title: "Failed to rename group", variant: "destructive" });
    } else {
      toast({ title: "Group renamed" });
      queryClient.invalidateQueries({ queryKey: ["group-chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["group-chats"] });
    }
    setIsEditing(false);
    setSaving(false);
  };

  const handleAddMembers = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const memberRows = Array.from(selectedIds).map((uid) => ({
        group_chat_id: chatId,
        user_id: uid,
      }));
      const { error } = await supabase.from("group_chat_members").insert(memberRows);
      if (error) throw error;

      // Update member count
      const newCount = memberCount + selectedIds.size;
      await supabase.from("group_chats").update({ member_count: newCount }).eq("id", chatId);

      queryClient.invalidateQueries({ queryKey: ["group-chat-members", chatId] });
      queryClient.invalidateQueries({ queryKey: ["group-chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["group-chats"] });
      queryClient.invalidateQueries({ queryKey: ["group-chat-available-friends", chatId] });

      toast({ title: `Added ${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""}` });
      setSelectedIds(new Set());
      setShowAddMembers(false);
    } catch {
      toast({ title: "Failed to add members", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("group_chat_members")
        .delete()
        .eq("group_chat_id", chatId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update member count
      const newCount = Math.max(0, memberCount - 1);
      await supabase.from("group_chats").update({ member_count: newCount }).eq("id", chatId);

      queryClient.invalidateQueries({ queryKey: ["group-chats"] });
      toast({ title: "You left the group" });
      onOpenChange(false);
      // Navigate back after leaving
      window.history.back();
    } catch {
      toast({ title: "Failed to leave group", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFriends = availableFriends.filter((f) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      f.display_name?.toLowerCase().includes(term) ||
      f.username?.toLowerCase().includes(term)
    );
  });

  const initials = chatName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-4 pt-6 pb-4">
          <SheetTitle className="text-left">Group Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Group avatar & name */}
          <div className="flex flex-col items-center gap-3 px-4 pb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            {isEditing ? (
              <div className="flex items-center gap-2 w-full max-w-[240px]">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9 text-sm text-center"
                  maxLength={100}
                  autoFocus
                />
                <button
                  onClick={handleRename}
                  disabled={saving}
                  className="p-1.5 rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setNewName(chatName);
                  }}
                  className="p-1.5 rounded-full bg-secondary text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNewName(chatName);
                  setIsEditing(true);
                }}
                className="flex items-center gap-1.5 group"
              >
                <span className="text-lg font-semibold text-foreground capitalize">
                  {chatName}
                </span>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <p className="text-xs text-muted-foreground">{memberCount} members</p>
          </div>

          <Separator />

          {/* Members list */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Members</h3>
              <button
                onClick={() => {
                  setShowAddMembers(!showAddMembers);
                  setSelectedIds(new Set());
                  setSearch("");
                }}
                className="flex items-center gap-1 text-xs text-primary font-medium"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            <div className="space-y-1">
              {members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-[10px]">
                      {(m.display_name || m.username || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {m.user_id === user?.id
                        ? "You"
                        : m.display_name || m.username || "User"}
                    </p>
                    {m.username && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        @{m.username}
                      </p>
                    )}
                  </div>
                  {m.user_id === user?.id && (
                    <span className="flex items-center gap-0.5 text-[10px] text-primary font-medium">
                      <Crown className="h-3 w-3" /> You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add members section */}
          {showAddMembers && (
            <>
              <Separator />
              <div className="px-4 py-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Add Friends
                </h3>
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search friends..."
                    className="pl-8 h-9 text-[13px]"
                  />
                </div>

                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {loadingFriends && (
                    <p className="text-[13px] text-muted-foreground text-center py-4">
                      Loading...
                    </p>
                  )}
                  {!loadingFriends && filteredFriends.length === 0 && (
                    <p className="text-[13px] text-muted-foreground text-center py-4">
                      {availableFriends.length === 0
                        ? "All friends are already in the group"
                        : "No results"}
                    </p>
                  )}
                  {filteredFriends.map((f) => (
                    <div
                      key={f.user_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleFriend(f.user_id)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && toggleFriend(f.user_id)
                      }
                      className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-secondary text-left cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(f.user_id)}
                        className="pointer-events-none"
                      />
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
                          <p className="text-[11px] text-muted-foreground truncate">
                            @{f.username}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedIds.size > 0 && (
                  <Button
                    onClick={handleAddMembers}
                    disabled={saving}
                    className="w-full mt-3"
                    size="sm"
                  >
                    {saving
                      ? "Adding..."
                      : `Add ${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Leave group */}
          <div className="px-4 py-4">
            <button
              onClick={handleLeaveGroup}
              disabled={saving}
              className="flex items-center gap-2.5 w-full px-2 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Leave Group</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GroupChatSettingsSheet;
