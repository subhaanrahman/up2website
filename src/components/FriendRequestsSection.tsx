import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X, UserPlus, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { connectionsRepository } from "@/features/social/repositories/connectionsRepository";
import { profilesRepository } from "@/features/social/repositories/profilesRepository";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";

interface PendingRequest {
  connectionId: string;
  requesterId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
}

export default function FriendRequestsSection() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      try {
        // Get ALL pending connections where current user is addressee
        const connections = await connectionsRepository.getPendingRequests(user.id);

        if (!connections || connections.length === 0) {
          setRequests([]);
          setLoading(false);
          return;
        }

        const requesterIds = connections.map((c) => c.requester_id);
        const profiles = await profilesRepository.getProfilesByIds(requesterIds);
        const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

        setRequests(
          connections.map((c) => {
            const p = profileMap.get(c.requester_id);
            return {
              connectionId: c.id,
              requesterId: c.requester_id,
              displayName: p?.display_name || "User",
              username: p?.username || "user",
              avatarUrl: p?.avatar_url || null,
              createdAt: c.created_at,
            };
          })
        );
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [user]);

  const handleAccept = async (req: PendingRequest) => {
    setActionLoading(req.connectionId);
    try {
      await connectionsRepository.acceptById(req.connectionId);
      toast.success(`You and ${req.displayName} are now friends!`);
      setRequests((prev) => prev.filter((r) => r.connectionId !== req.connectionId));
    } catch {
      toast.error("Failed to accept request");
    }
    setActionLoading(null);
  };

  const handleReject = async (req: PendingRequest) => {
    setActionLoading(req.connectionId);
    try {
      await connectionsRepository.deleteById(req.connectionId);
    } catch {
      // ignore
    }
    setRequests((prev) => prev.filter((r) => r.connectionId !== req.connectionId));
    toast("Request declined");
    setActionLoading(null);
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card rounded-tile-sm"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            Friend Requests ({requests.length})
          </span>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="mt-2 space-y-2">
          {requests.map((req) => (
            <div
              key={req.connectionId}
              className="flex items-center gap-3 p-3 bg-card rounded-tile-sm"
            >
              <Link to={`/user/${req.requesterId}`}>
                <Avatar className="h-11 w-11">
                  <AvatarImage src={req.avatarUrl || undefined} />
                  <AvatarFallback className="bg-secondary text-foreground font-semibold">
                    {req.displayName[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/user/${req.requesterId}`}>
                  <p className="font-semibold text-foreground text-sm truncate">
                    {req.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">@{req.username}</p>
                </Link>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => handleAccept(req)}
                  disabled={actionLoading === req.connectionId}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 rounded-full"
                  onClick={() => handleReject(req)}
                  disabled={actionLoading === req.connectionId}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
