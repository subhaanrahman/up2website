import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Search, Upload, Crown, X } from "lucide-react";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

const ManageEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"main" | "orders" | "media">("main");

  // Fetch event details
  const { data: event } = useQuery({
    queryKey: ["manage-event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, organiser_profiles(display_name, owner_id)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch orders for this event (via service — host needs to see all orders)
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["event-orders", id],
    queryFn: async () => {
      // Orders table RLS only allows users to see their own orders.
      // For now we show what's available; full host-view requires an edge function.
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles:user_id(display_name, email, first_name, last_name)")
        .eq("event_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch RSVPs/guestlist
  const { data: rsvps, isLoading: rsvpsLoading } = useQuery({
    queryKey: ["event-rsvps-manage", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rsvps")
        .select("*, profiles:user_id(display_name, email, first_name, last_name)")
        .eq("event_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const eventEnded = event ? new Date(event.event_date) < new Date() : false;

  const filteredOrders = orders?.filter((o: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = o.profiles?.display_name || o.profiles?.first_name || "";
    const email = o.profiles?.email || "";
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || o.id.includes(q);
  });

  const filteredRsvps = rsvps?.filter((r: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = r.profiles?.display_name || r.profiles?.first_name || "";
    const email = r.profiles?.email || "";
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  if (activeSection === "media") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between px-4 h-14">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary/80" onClick={() => setActiveSection("main")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h1 className="text-sm font-semibold capitalize">{event?.title}</h1>
              <p className="text-[11px] opacity-80">Upload Media</p>
            </div>
            <div className="w-9" />
          </div>
        </header>
        <main className="p-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-1">Event Photo Gallery</h3>
            <p className="text-sm text-muted-foreground mb-6">Upload photos from your event for attendees to view</p>
            <Button variant="outline" disabled>
              <Upload className="h-4 w-4 mr-2" /> Upload Photos (Coming Soon)
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary/80" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-sm font-semibold capitalize line-clamp-1">{event?.title}</h1>
            <p className="text-[11px] opacity-80">{eventEnded ? "This event has ended" : "Managing event"}</p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {/* Tabs: Orders | Guestlist | Refunds */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border bg-background h-11">
          <TabsTrigger value="orders" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Orders
          </TabsTrigger>
          <TabsTrigger value="guestlist" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Guestlist
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Refunds
          </TabsTrigger>
        </TabsList>

        {/* Search bar */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Surname, email, order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-0 h-10"
            />
          </div>
        </div>

        {/* Orders Tab */}
        <TabsContent value="orders" className="px-4 mt-0">
          {ordersLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-2 py-3 border-b border-border">
                  <div className="h-5 w-2/3 bg-secondary rounded" />
                  <div className="h-4 w-1/2 bg-secondary rounded" />
                </div>
              ))}
            </div>
          ) : !filteredOrders?.length ? (
            <div className="text-center py-12">
              <X className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredOrders.map((order: any) => {
                const name = order.profiles?.display_name
                  || [order.profiles?.first_name, order.profiles?.last_name].filter(Boolean).join(" ")
                  || "Unknown";
                const email = order.profiles?.email || "";
                return (
                  <button
                    key={order.id}
                    className="w-full text-left py-4 hover:bg-secondary/50 transition-colors"
                    onClick={() => {
                      // Navigate to user profile if available
                      if (order.user_id) navigate(`/user/${order.user_id}`);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{name}</p>
                        <p className="text-sm text-muted-foreground truncate">{email}</p>
                        <p className="text-sm text-muted-foreground">
                          Order no.:{order.id.slice(0, 13)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm text-foreground">{format(new Date(order.created_at), "d/M/yyyy")}</p>
                        <p className="text-sm text-muted-foreground capitalize">{order.status}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Guestlist Tab */}
        <TabsContent value="guestlist" className="px-4 mt-0">
          {rsvpsLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-2 py-3 border-b border-border">
                  <div className="h-5 w-2/3 bg-secondary rounded" />
                  <div className="h-4 w-1/2 bg-secondary rounded" />
                </div>
              ))}
            </div>
          ) : !filteredRsvps?.length ? (
            <div className="text-center py-12">
              <X className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No guests found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRsvps.map((rsvp: any) => {
                const name = rsvp.profiles?.display_name
                  || [rsvp.profiles?.first_name, rsvp.profiles?.last_name].filter(Boolean).join(" ")
                  || "Unknown";
                const email = rsvp.profiles?.email || "";
                return (
                  <button
                    key={rsvp.id}
                    className="w-full text-left py-4 hover:bg-secondary/50 transition-colors"
                    onClick={() => {
                      if (rsvp.user_id) navigate(`/user/${rsvp.user_id}`);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{name}</p>
                        <p className="text-sm text-muted-foreground truncate">{email}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm text-foreground">{format(new Date(rsvp.created_at), "d/M/yyyy")}</p>
                        <p className="text-sm text-muted-foreground capitalize">{rsvp.status}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="px-4 mt-0">
          <div className="py-6">
            <h3 className="font-semibold text-foreground mb-3">Refund Requests</h3>
            <div className="text-center py-8 border border-dashed border-border rounded-xl">
              <X className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No refund requests found</p>
            </div>
          </div>
          <div className="py-6">
            <h3 className="font-semibold text-foreground mb-3">Processed Refunds</h3>
            <div className="text-center py-8 border border-dashed border-border rounded-xl">
              <X className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No refund orders found</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bottom action buttons for Upload Media & VIP */}
      <div className="px-4 pt-4 space-y-2">
        <Button variant="outline" className="w-full justify-start h-12" onClick={() => setActiveSection("media")}>
          <Upload className="h-5 w-5 mr-3 text-primary" />
          Upload Media
        </Button>
        <Button variant="outline" className="w-full justify-start h-12" disabled>
          <Crown className="h-5 w-5 mr-3 text-muted-foreground" />
          VIP Tables — Coming Soon
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ManageEvent;
