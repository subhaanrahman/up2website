import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, UserPlus, X, Crown, Shield, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { organiserTeamRepository } from "@/features/social/repositories/organiserTeamRepository";
import { profilesRepository } from "@/features/social/repositories/profilesRepository";
import { toast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface SearchUser {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

const OrganiserTeam = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProfile, isOrganiser, organiserProfiles } = useActiveProfile();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("editor");

  const activeOrg = isOrganiser ? organiserProfiles.find((o) => o.id === activeProfile?.id) : undefined;
  const isOwner = activeOrg?.ownerId === user?.id;

  const fetchMembers = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const data = await organiserTeamRepository.getMembers(activeOrg.id);
      const userIds = data.map((m: any) => m.user_id);
      const profiles = userIds.length > 0
        ? await profilesRepository.getProfilesByIds(userIds)
        : [];
      const profilesMap = new Map(profiles.map((p) => [p.user_id, p]));

      setMembers(
        data.map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          role: m.role,
          status: m.status,
          createdAt: m.created_at,
          acceptedAt: m.accepted_at,
          displayName: profilesMap.get(m.user_id)?.display_name || null,
          username: profilesMap.get(m.user_id)?.username || null,
          avatarUrl: profilesMap.get(m.user_id)?.avatar_url || null,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [activeOrg]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const data = await profilesRepository.searchProfiles(searchQuery.trim(), { limit: 10 });

      // Filter out current user, owner, and existing members
      const existingUserIds = new Set(members.map((m) => m.userId));
      existingUserIds.add(user?.id || "");

      setSearchResults(
        data
          .filter((p: any) => !existingUserIds.has(p.user_id))
          .map((p: any) => ({
            userId: p.user_id,
            displayName: p.display_name,
            username: p.username,
            avatarUrl: p.avatar_url,
          }))
      );
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, members, user?.id]);

  const handleInvite = async (targetUserId: string) => {
    if (!activeOrg || !user) return;
    try {
      await organiserTeamRepository.inviteMember({
        organiserProfileId: activeOrg.id,
        targetUserId,
        role: inviteRole,
        invitedBy: user.id,
      });
      toast({ title: "Invite sent!" });
      setSearchQuery("");
      setSearchResults([]);
      fetchMembers();
    } catch (err: any) {
      toast({ title: "Failed to invite", description: err?.message, variant: "destructive" });
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await organiserTeamRepository.removeMember(memberId);
      toast({ title: "Member removed" });
      fetchMembers();
    } catch (err: any) {
      toast({ title: "Failed to remove", description: err?.message, variant: "destructive" });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await organiserTeamRepository.updateRole(memberId, newRole);
      fetchMembers();
    } catch (err: any) {
      toast({ title: "Failed to update role", description: err?.message, variant: "destructive" });
    }
  };

  if (!isOrganiser || !activeOrg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Switch to an organiser profile to manage your team.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Manage Team</h1>
        </div>
      </header>

      <main className="px-4 pt-4 max-w-lg mx-auto space-y-6">
        {/* Owner card */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Owner</p>
          <div className="flex items-center gap-3 p-3 bg-card rounded-xl">
            <Avatar className="h-10 w-10">
              <AvatarImage src={activeOrg.avatarUrl || undefined} />
              <AvatarFallback>{activeOrg.displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{activeOrg.displayName}</p>
              <p className="text-sm text-muted-foreground">@{activeOrg.username}</p>
            </div>
            <Crown className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Invite section (owner only) */}
        {isOwner && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Invite Team Member
            </p>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="bg-card rounded-xl overflow-hidden border border-border">
                {searching ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">Searching...</p>
                ) : searchResults.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">No users found</p>
                ) : (
                  searchResults.map((u) => (
                    <div key={u.userId} className="flex items-center gap-3 p-3 border-b border-border last:border-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatarUrl || undefined} />
                        <AvatarFallback>{(u.displayName || u.username || "U")[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{u.displayName || "User"}</p>
                        {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                      </div>
                      <Button size="sm" onClick={() => handleInvite(u.userId)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Invite
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Current members */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Team Members {members.length > 0 && `(${members.length})`}
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No team members yet</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="p-3 bg-card rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback>{(member.displayName || "U")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{member.displayName || "User"}</p>
                      {member.username && <p className="text-xs text-muted-foreground">@{member.username}</p>}
                    </div>
                    <Badge variant={member.status === "accepted" ? "default" : "secondary"} className="text-xs flex-shrink-0">
                      {member.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pl-13">
                    <Badge variant="outline" className="text-xs capitalize">
                      {member.role === "admin" ? <Shield className="h-3 w-3 mr-1" /> : <Pencil className="h-3 w-3 mr-1" />}
                      {member.role}
                    </Badge>
                    {isOwner && (
                      <div className="flex items-center gap-1">
                        <Select value={member.role} onValueChange={(v) => handleRoleChange(member.id, v)}>
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleRemove(member.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
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

export default OrganiserTeam;
