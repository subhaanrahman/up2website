import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Search, ScanLine, ShoppingCart, Check, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { callEdgeFunction } from "@/infrastructure/api-client";

interface Attendee {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  tier: string;
  source: "ticket" | "rsvp" | "guestlist";
  checked_in: boolean;
}

const EventCheckIn = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch event
  const { data: event } = useQuery({
    queryKey: ["checkin-event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_date")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch all attendees (rsvps + orders) via orders-list edge function
  const { data: manageData, isLoading } = useQuery({
    queryKey: ["checkin-attendees", id],
    queryFn: async () => {
      return callEdgeFunction<{ orders: any[]; rsvps: any[] }>("orders-list", {
        body: { event_id: id },
      });
    },
    enabled: !!id,
  });

  // Fetch check-ins for this event
  const { data: checkIns } = useQuery({
    queryKey: ["check-ins", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("user_id")
        .eq("event_id", id!);
      if (error) throw error;
      return new Set((data || []).map((c: any) => c.user_id));
    },
    enabled: !!id,
  });

  // Fetch ticket tiers for labeling
  const { data: tiers } = useQuery({
    queryKey: ["checkin-tiers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_tiers")
        .select("id, name")
        .eq("event_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const checkedInSet = checkIns || new Set<string>();

  // Build unified attendee list
  const attendees: Attendee[] = [];
  const seenUserIds = new Set<string>();

  // Add order holders as "ticket" attendees
  manageData?.orders?.forEach((order: any) => {
    if (order.user_id && !seenUserIds.has(order.user_id)) {
      seenUserIds.add(order.user_id);
      attendees.push({
        user_id: order.user_id,
        display_name: order.profile?.display_name || [order.profile?.first_name, order.profile?.last_name].filter(Boolean).join(" ") || "Unknown",
        avatar_url: order.profile?.avatar_url || null,
        tier: "Ticket Holder",
        source: "ticket",
        checked_in: checkedInSet.has(order.user_id),
      });
    }
  });

  // Add RSVPs
  manageData?.rsvps?.forEach((rsvp: any) => {
    if (rsvp.user_id && !seenUserIds.has(rsvp.user_id)) {
      seenUserIds.add(rsvp.user_id);
      attendees.push({
        user_id: rsvp.user_id,
        display_name: rsvp.profile?.display_name || [rsvp.profile?.first_name, rsvp.profile?.last_name].filter(Boolean).join(" ") || "Unknown",
        avatar_url: rsvp.profile?.avatar_url || null,
        tier: "Guestlist",
        source: "rsvp",
        checked_in: checkedInSet.has(rsvp.user_id),
      });
    }
  });

  // Filter by search
  const filtered = searchQuery
    ? attendees.filter((a) => a.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : attendees;

  // Sort: unchecked first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    if (a.checked_in !== b.checked_in) return a.checked_in ? 1 : -1;
    return a.display_name.localeCompare(b.display_name);
  });

  const checkedInCount = attendees.filter((a) => a.checked_in).length;

  // Toggle check-in mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "check_in" | "check_out" }) => {
      return callEdgeFunction("checkin-toggle", {
        body: { event_id: id, user_id: userId, action, method: "manual" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["check-ins", id] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to toggle check-in", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary/80" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-sm font-semibold capitalize line-clamp-1">{event?.title || "Check In"}</h1>
            <p className="text-[11px] opacity-80">
              {checkedInCount}/{attendees.length} checked in
            </p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search attendees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-0 h-10"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-3 flex gap-2">
        <Button variant="outline" className="flex-1 h-10" disabled>
          <ScanLine className="h-4 w-4 mr-2" />
          QR Scan Mode
        </Button>
        <Button variant="outline" className="flex-1 h-10" disabled>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Buy @ Door
        </Button>
      </div>

      <div className="px-4 flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">
          {sorted.length} attendee{sorted.length !== 1 ? "s" : ""}
        </p>
        <Badge variant="secondary" className="text-xs">
          <UserCheck className="h-3 w-3 mr-1" />
          {checkedInCount} in
        </Badge>
      </div>

      {/* Attendee list */}
      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse py-3">
                <div className="w-10 h-10 bg-secondary rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-secondary rounded" />
                  <div className="h-3 w-1/3 bg-secondary rounded" />
                </div>
                <div className="w-24 h-9 bg-secondary rounded" />
              </div>
            ))}
          </div>
        ) : !sorted.length ? (
          <div className="text-center py-12">
            <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              {searchQuery ? "No attendees match your search" : "No attendees yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((attendee) => (
              <div key={attendee.user_id} className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {attendee.avatar_url ? (
                    <img src={attendee.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {attendee.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{attendee.display_name}</p>
                  <p className="text-xs text-muted-foreground">{attendee.tier}</p>
                </div>
                <Button
                  size="sm"
                  variant={attendee.checked_in ? "default" : "outline"}
                  className={`h-9 min-w-[100px] text-xs font-medium ${
                    attendee.checked_in
                      ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                      : ""
                  }`}
                  disabled={toggleMutation.isPending}
                  onClick={() =>
                    toggleMutation.mutate({
                      userId: attendee.user_id,
                      action: attendee.checked_in ? "check_out" : "check_in",
                    })
                  }
                >
                  {attendee.checked_in ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Checked In
                    </>
                  ) : (
                    "Check In"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default EventCheckIn;
