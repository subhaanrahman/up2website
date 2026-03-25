import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, UserPlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { dedupeAndCapInviteUserIds, HOST_RSVP_INVITE_MAX } from "@/utils/hostRsvpInvite";

type ProfileHit = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const MAX_INVITES = HOST_RSVP_INVITE_MAX;

const SendRsvp = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selected, setSelected] = useState<ProfileHit[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 280);
    return () => window.clearTimeout(t);
  }, [q]);

  const canSearch = debouncedQ.length >= 2;

  const { data: searchData, isFetching } = useQuery({
    queryKey: ["profile-search-host", eventId, debouncedQ],
    queryFn: async () => {
      return callEdgeFunction<{ profiles: ProfileHit[] }>("profile-search-host", {
        body: { event_id: eventId, q: debouncedQ, limit: 20 },
      });
    },
    enabled: !!eventId && canSearch,
    staleTime: 15_000,
  });

  const hits = useMemo(() => {
    const rows = searchData?.profiles ?? [];
    const sel = new Set(selected.map((s) => s.user_id));
    return rows.filter((p) => !sel.has(p.user_id));
  }, [searchData, selected]);

  const addProfile = (p: ProfileHit) => {
    if (selected.length >= MAX_INVITES) {
      toast({
        title: "Limit reached",
        description: `You can add up to ${MAX_INVITES} people per send.`,
        variant: "destructive",
      });
      return;
    }
    if (selected.some((s) => s.user_id === p.user_id)) return;
    setSelected((prev) => [...prev, p]);
    setQ("");
  };

  const removeProfile = (userId: string) => {
    setSelected((prev) => prev.filter((p) => p.user_id !== userId));
  };

  const handleSend = async () => {
    if (!eventId || selected.length === 0) return;
    setSubmitting(true);
    try {
      const res = await callEdgeFunction<{
        results: Array<{ user_id: string; code: string; message?: string }>;
      }>("rsvp-bulk-invite", {
        body: { event_id: eventId, user_ids: dedupeAndCapInviteUserIds(selected.map((s) => s.user_id)) },
      });
      const results = res?.results ?? [];
      const ok = results.filter((r) => r.code === "ok").length;
      const wait = results.filter((r) => r.code === "waitlisted").length;
      const dup = results.filter((r) => r.code === "already_rsvp").length;
      const err = results.filter((r) => r.code === "error");
      toast({
        title: "Invites processed",
        description: [
          ok ? `${ok} added` : null,
          wait ? `${wait} waitlisted` : null,
          dup ? `${dup} already on list` : null,
          err.length ? `${err.length} failed` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
      if (err.length > 0) {
        toast({
          title: "Some invites failed",
          description: err.map((e) => e.message || e.code).slice(0, 3).join("; "),
          variant: "destructive",
        });
      }
      setSelected([]);
      navigate(`/events/${eventId}/manage`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not send invites";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!eventId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-primary-foreground hover:bg-primary/80"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1 min-w-0 px-2">
            <h1 className="text-sm font-semibold truncate">Send RSVP</h1>
            <p className="text-[11px] opacity-80 truncate">Search by username · max {MAX_INVITES}</p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search username…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 bg-secondary border-0 h-11"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        {!canSearch && (
          <p className="text-xs text-muted-foreground">Type at least 2 characters to search.</p>
        )}

        {canSearch && (
          <div className="rounded-tile border border-border/70 bg-card max-h-[220px] overflow-y-auto">
            {isFetching ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : hits.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No users match that username.</div>
            ) : (
              <ul className="divide-y divide-border" role="listbox">
                {hits.map((p) => (
                  <li key={p.user_id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/80 transition-colors",
                        selected.length >= MAX_INVITES && "opacity-50 pointer-events-none",
                      )}
                      onClick={() => addProfile(p)}
                      disabled={selected.length >= MAX_INVITES}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.avatar_url || undefined} surface="send-rsvp-search" />
                        <AvatarFallback className="text-xs font-medium">
                          {(p.username || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">@{p.username}</p>
                        {p.display_name ? (
                          <p className="text-xs text-muted-foreground truncate">{p.display_name}</p>
                        ) : null}
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Selected ({selected.length}/{MAX_INVITES})
          </p>
          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody selected yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selected.map((p) => (
                <span
                  key={p.user_id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-secondary text-sm border border-border/80"
                >
                  <span className="max-w-[140px] truncate">@{p.username}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-background/80"
                    onClick={() => removeProfile(p.user_id)}
                    aria-label={`Remove ${p.username}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Button
          className="w-full h-12"
          disabled={selected.length === 0 || submitting}
          onClick={handleSend}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            `Send RSVP${selected.length ? ` (${selected.length})` : ""}`
          )}
        </Button>
      </main>
      <BottomNav />
    </div>
  );
};

export default SendRsvp;
