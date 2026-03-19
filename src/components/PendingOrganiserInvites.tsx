import { useState, useEffect } from "react";
import { Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { supabase } from '@/infrastructure/supabase';
import { toast } from "@/hooks/use-toast";

interface PendingInvite {
  id: string;
  organiserProfileId: string;
  role: string;
  organiserName: string;
  organiserAvatar: string | null;
}

export default function PendingOrganiserInvites() {
  const { user } = useAuth();
  const { refetchOrganiserProfiles } = useActiveProfile();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("organiser_members")
      .select("id, organiser_profile_id, role")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error || !data || data.length === 0) {
      setInvites([]);
      setLoading(false);
      return;
    }

    // Fetch organiser profile names
    const orgIds = data.map((d: any) => d.organiser_profile_id);
    const { data: orgs } = await supabase
      .from("organiser_profiles")
      .select("id, display_name, avatar_url")
      .in("id", orgIds);

    const orgMap: Record<string, any> = {};
    (orgs || []).forEach((o: any) => { orgMap[o.id] = o; });

    setInvites(
      data.map((d: any) => ({
        id: d.id,
        organiserProfileId: d.organiser_profile_id,
        role: d.role,
        organiserName: orgMap[d.organiser_profile_id]?.display_name || "Unknown",
        organiserAvatar: orgMap[d.organiser_profile_id]?.avatar_url || null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchInvites();
  }, [user]);

  const respond = async (inviteId: string, accept: boolean) => {
    const update: any = { status: accept ? "accepted" : "declined" };
    if (accept) update.accepted_at = new Date().toISOString();

    const { error } = await supabase
      .from("organiser_members")
      .update(update)
      .eq("id", inviteId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: accept ? "Invite accepted!" : "Invite declined" });
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));

    if (accept) {
      await refetchOrganiserProfiles();
    }
  };

  if (loading || invites.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Team Invites
        </p>
      </div>
      {invites.map((invite) => (
        <div key={invite.id} className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-tile-sm">
          <Avatar className="h-10 w-10">
            <AvatarImage src={invite.organiserAvatar || undefined} />
            <AvatarFallback>{invite.organiserName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{invite.organiserName}</p>
            <p className="text-xs text-muted-foreground">
              Invited you as <Badge variant="outline" className="text-xs capitalize ml-1">{invite.role}</Badge>
            </p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="default" className="h-8" onClick={() => respond(invite.id, true)}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => respond(invite.id, false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
