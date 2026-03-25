import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Image,
  FileText,
  MapPin,
  Instagram,
  CalendarPlus,
  Users,
  Music,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import { useStripeConnectOnboard } from "@/hooks/useStripeConnectOnboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase";
import { organiserTeamRepository } from "@/features/social/repositories/organiserTeamRepository";
import type { OrganiserProfile } from "@/contexts/ActiveProfileContext";

const STORAGE_KEY_PREFIX = "organiser-setup-dismissed-";

type TaskId =
  | "payout"
  | "avatar"
  | "bio"
  | "city"
  | "instagram"
  | "first_event"
  | "team_member"
  | "connect_spotify";

interface TaskDef {
  id: TaskId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isComplete: (ctx: TaskContext) => boolean;
  cta?: React.ReactNode;
}

interface TaskContext {
  activeOrg: OrganiserProfile;
  connectStatus: { charges_enabled: boolean } | undefined;
  eventCount: number;
  teamMemberCount: number;
  spotifyConnected: boolean;
}

function getDismissedTasks(organiserProfileId: string): TaskId[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${organiserProfileId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dismissTask(organiserProfileId: string, taskId: TaskId): void {
  const current = getDismissedTasks(organiserProfileId);
  if (current.includes(taskId)) return;
  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${organiserProfileId}`,
    JSON.stringify([...current, taskId])
  );
}

interface OrganiserSetupTasksSectionProps {
  organiserProfileId: string;
  activeOrg: OrganiserProfile;
}

const OrganiserSetupTasksSection = ({
  organiserProfileId,
  activeOrg,
}: OrganiserSetupTasksSectionProps) => {
  const [dismissed, setDismissed] = useState<TaskId[]>(() =>
    getDismissedTasks(organiserProfileId)
  );
  const { data: connectStatus } = useStripeConnectStatus(organiserProfileId);
  const { startOnboarding, isOnboarding } =
    useStripeConnectOnboard(organiserProfileId);

  const { data: eventCount = 0 } = useQuery({
    queryKey: ["organiser-event-count", organiserProfileId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { count, error } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("organiser_profile_id", organiserProfileId)
        .eq("status", "published")
        .or(`publish_at.is.null,publish_at.lte.${now}`);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!organiserProfileId,
  });

  const { data: teamMemberCount = 0 } = useQuery({
    queryKey: ["organiser-team-count", organiserProfileId],
    queryFn: async () => {
      const members = await organiserTeamRepository.getMembers(organiserProfileId);
      return members.length;
    },
    enabled: !!organiserProfileId,
  });

  const { data: spotifyConnected = false } = useQuery({
    queryKey: ["spotify-connected", activeOrg.ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_music_connections")
        .select("connected")
        .eq("user_id", activeOrg.ownerId)
        .eq("service_id", "spotify")
        .maybeSingle();
      if (error) throw error;
      return data?.connected ?? false;
    },
    enabled: !!activeOrg?.ownerId,
  });

  const ctx: TaskContext = {
    activeOrg,
    connectStatus,
    eventCount,
    teamMemberCount,
    spotifyConnected,
  };

  const handleDismiss = useCallback(
    (taskId: TaskId) => {
      dismissTask(organiserProfileId, taskId);
      setDismissed((prev) => [...prev, taskId]);
    },
    [organiserProfileId]
  );

  const editLink = `/profile/edit-organiser?org=${encodeURIComponent(organiserProfileId)}`;

  const taskDefs: TaskDef[] = [
    {
      id: "payout",
      title: "Add payout method",
      icon: CreditCard,
      isComplete: (c) => !!c.connectStatus?.charges_enabled,
      cta: (
        <Button
          size="sm"
          onClick={() => startOnboarding()}
          disabled={isOnboarding}
          className="w-full justify-center text-xs font-medium"
        >
          {isOnboarding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Set up payouts"
          )}
        </Button>
      ),
    },
    {
      id: "avatar",
      title: "Add profile photo",
      icon: Image,
      isComplete: (c) => !!c.activeOrg?.avatarUrl,
      cta: (
        <Link
          to={editLink}
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/90 transition-colors"
        >
          Add photo
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "bio",
      title: "Add bio",
      icon: FileText,
      isComplete: (c) => !!c.activeOrg?.bio?.trim(),
      cta: (
        <Link
          to={editLink}
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/90 transition-colors"
        >
          Add bio
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "city",
      title: "Add city",
      icon: MapPin,
      isComplete: (c) => !!c.activeOrg?.city?.trim(),
      cta: (
        <Link
          to={editLink}
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/90 transition-colors"
        >
          Add city
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "instagram",
      title: "Add Instagram handle",
      icon: Instagram,
      isComplete: (c) => !!c.activeOrg?.instagramHandle?.trim(),
      cta: (
        <Link
          to={editLink}
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/90 transition-colors"
        >
          Add Instagram
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "first_event",
      title: "Create your first event",
      icon: CalendarPlus,
      isComplete: (c) => c.eventCount >= 1,
      cta: (
        <Link
          to="/create"
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/90 transition-colors"
        >
          Create event
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "team_member",
      title: "Invite a team member",
      icon: Users,
      isComplete: (c) => c.teamMemberCount >= 1,
      cta: (
        <Link
          to="/profile/organiser-team"
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/90 transition-colors"
        >
          Invite member
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "connect_spotify",
      title: "Connect Spotify",
      icon: Music,
      isComplete: (c) => {
        const cat = c.activeOrg.category?.toLowerCase();
        if (cat !== "artist" && cat !== "dj") return true;
        return c.spotifyConnected;
      },
      cta: (
        <Link
          to="/settings/music"
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/90 transition-colors"
        >
          Connect music
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  const activeTasks = taskDefs.filter(
    (t) => !t.isComplete(ctx) && !dismissed.includes(t.id)
  );

  if (activeTasks.length === 0) return null;

  return (
    <div className="mb-4 -mx-4 px-4">
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {activeTasks.map((task) => {
          const Icon = task.icon;
          return (
            <div
              key={task.id}
              className="group relative flex flex-col items-center text-center bg-card/80 border border-border rounded-tile-sm p-4 pt-5 hover:bg-card hover:border-border/80 transition-colors shrink-0 min-w-[140px]"
            >
              <button
                onClick={() => handleDismiss(task.id)}
                className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center mb-2.5 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-[13px] font-medium text-foreground leading-tight line-clamp-2">
                {task.title}
              </p>
              <div className="mt-2 w-full flex justify-center">
                {task.cta}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrganiserSetupTasksSection;
