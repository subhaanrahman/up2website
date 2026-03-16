import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/infrastructure/supabase';
import { eventManagementRepository } from "@/features/events/repositories/eventManagementRepository";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Search, Upload, Crown, X, Download, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { callEdgeFunction } from "@/infrastructure/api-client";

const ManageEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"main" | "media">("main");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch event details
  const { data: event } = useQuery({
    queryKey: ["manage-event", id],
    queryFn: async () => {
      return eventManagementRepository.getEventWithOrganiserProfile(id!);
    },
    enabled: !!id,
  });

  // Fetch orders + rsvps via edge function (host-only, bypasses RLS)
  const { data: manageData, isLoading } = useQuery({
    queryKey: ["event-manage-data", id],
    queryFn: async () => {
      return callEdgeFunction<{ orders: any[]; rsvps: any[] }>("orders-list", {
        body: { event_id: id },
      });
    },
    enabled: !!id,
  });

  const orders = manageData?.orders || [];
  const rsvps = manageData?.rsvps || [];

  // Fetch refunds for this event
  const { data: refundsData = [], isLoading: refundsLoading } = useQuery({
    queryKey: ["event-refunds", id],
    queryFn: async () => {
      return eventManagementRepository.getRefundsForEvent(id!);
    },
    enabled: !!id,
  });

  // Fetch event media
  const { data: media, refetch: refetchMedia } = useQuery({
    queryKey: ["event-media", id],
    queryFn: async () => {
      return eventManagementRepository.getEventMedia(id!);
    },
    enabled: !!id,
  });

  const eventEnded = event ? new Date(event.event_date) < new Date() : false;

  // Search filter
  const filterBySearch = (items: any[]) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const name = item.profile?.display_name || item.profile?.first_name || "";
      const email = item.profile?.email || "";
      const phone = item.profile?.phone || "";
      const orderId = item.id || "";
      return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || phone.toLowerCase().includes(q) || orderId.includes(q);
    });
  };

  const filteredOrders = filterBySearch(orders);
  const filteredRsvps = filterBySearch(rsvps);

  // CSV export for guestlist
  const exportCsv = () => {
    if (!rsvps.length) return;
    const headers = ["Name", "Email", "Phone", "Status", "Date"];
    const rows = rsvps.map((r: any) => {
      const name = r.profile?.display_name || [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(" ") || "Unknown";
      return [
        name,
        r.profile?.email || "",
        r.profile?.phone || "",
        r.status,
        format(new Date(r.created_at), "d/M/yyyy"),
      ].map((v) => `"${v}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guestlist-${event?.title || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Media upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !user || !id) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${id}/${Date.now()}-${i}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("event-media")
          .upload(path, file);

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("event-media")
          .getPublicUrl(path);

        await eventManagementRepository.insertMedia({
          eventId: id,
          url: urlData.publicUrl,
          uploadedBy: user.id,
          sortOrder: (media?.length || 0) + i,
        });
      }
      toast({ title: "Uploaded!", description: `${files.length} photo(s) added to gallery.` });
      refetchMedia();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteMedia = async (mediaId: string, url: string) => {
    try {
      // Extract path from URL for storage deletion
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/event-media\/(.+)$/);

      await eventManagementRepository.deleteMedia(mediaId);
      if (pathMatch) {
        await supabase.storage.from("event-media").remove([pathMatch[1]]);
      }
      refetchMedia();
      toast({ title: "Deleted", description: "Photo removed from gallery." });
    } catch {
      toast({ title: "Error", description: "Failed to delete photo.", variant: "destructive" });
    }
  };

  // ---- MEDIA SECTION ----
  if (activeSection === "media") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between px-4 h-14">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-primary/80" onClick={() => setActiveSection("main")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h1 className="text-sm font-semibold capitalize line-clamp-1">{event?.title}</h1>
              <p className="text-[11px] opacity-80">Upload Media</p>
            </div>
            <div className="w-9" />
          </div>
        </header>
        <main className="p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleMediaUpload}
          />

          <Button
            className="w-full mb-4 h-12"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-5 w-5 mr-2" />
            {uploading ? "Uploading..." : "Upload Photos"}
          </Button>

          {(!media || media.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-1">Event Photo Gallery</h3>
              <p className="text-sm text-muted-foreground">Upload photos from your event for attendees to view</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {media.map((item: any) => (
                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDeleteMedia(item.id, item.url)}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  // ---- MAIN SECTION (Orders/Guestlist/Refunds) ----
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

      {/* Tabs */}
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

        {/* Search */}
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

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="px-4 mt-0">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-2 py-3 border-b border-border">
                  <div className="h-5 w-2/3 bg-secondary rounded" />
                  <div className="h-4 w-1/2 bg-secondary rounded" />
                </div>
              ))}
            </div>
          ) : !filteredOrders.length ? (
            <div className="text-center py-12">
              <X className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredOrders.map((order: any) => {
                const name = order.profile?.display_name
                  || [order.profile?.first_name, order.profile?.last_name].filter(Boolean).join(" ")
                  || "Unknown";
                const email = order.profile?.email || "";
                const paymentType = order.stripe_payment_intent_id ? "Card" : "—";
                return (
                  <button
                    key={order.id}
                    className="w-full text-left py-4 hover:bg-secondary/50 transition-colors"
                    onClick={() => { if (order.user_id) navigate(`/user/${order.user_id}`); }}
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
                        <p className="text-sm text-foreground">
                          {format(new Date(order.created_at), "d/M/yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">{paymentType}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* GUESTLIST TAB */}
        <TabsContent value="guestlist" className="mt-0">
          {/* CSV Export + count header */}
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-sm text-muted-foreground">
              {rsvps.length} guest{rsvps.length !== 1 ? "s" : ""}
            </p>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rsvps.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
          </div>

          <div className="px-4">
            {isLoading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2 py-3 border-b border-border">
                    <div className="h-5 w-2/3 bg-secondary rounded" />
                    <div className="h-4 w-1/2 bg-secondary rounded" />
                  </div>
                ))}
              </div>
            ) : !filteredRsvps.length ? (
              <div className="text-center py-12">
                <X className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No guests found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRsvps.map((rsvp: any) => {
                  const name = rsvp.profile?.display_name
                    || [rsvp.profile?.first_name, rsvp.profile?.last_name].filter(Boolean).join(" ")
                    || "Unknown";
                  const email = rsvp.profile?.email || "";
                  return (
                    <button
                      key={rsvp.id}
                      className="w-full text-left py-4 hover:bg-secondary/50 transition-colors"
                      onClick={() => { if (rsvp.user_id) navigate(`/user/${rsvp.user_id}`); }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{name}</p>
                          <p className="text-sm text-muted-foreground truncate">{email}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-sm text-foreground">
                            {format(new Date(rsvp.created_at), "d/M/yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">{rsvp.status}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* REFUNDS TAB */}
        <TabsContent value="refunds" className="px-4 mt-0">
          {refundsLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Pending requests */}
              <div className="py-6">
                <h3 className="font-semibold text-foreground mb-3">Refund Requests</h3>
                {refundsData.filter((r: any) => r.status === "pending").length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl">
                    <X className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No pending refund requests</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {refundsData.filter((r: any) => r.status === "pending").map((refund: any) => (
                      <div key={refund.id} className="flex items-start justify-between p-4 bg-card rounded-xl border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">Order {refund.order_id.slice(0, 8)}</p>
                          {refund.reason && <p className="text-xs text-muted-foreground mt-0.5 truncate">{refund.reason}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(refund.created_at), "d MMM yyyy")}</p>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-sm font-semibold text-foreground">R{(refund.amount_cents / 100).toFixed(2)}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">Pending</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Processed refunds */}
              <div className="py-6">
                <h3 className="font-semibold text-foreground mb-3">Processed Refunds</h3>
                {refundsData.filter((r: any) => r.status !== "pending").length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl">
                    <X className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No processed refunds</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {refundsData.filter((r: any) => r.status !== "pending").map((refund: any) => (
                      <div key={refund.id} className="flex items-start justify-between p-4 bg-card rounded-xl border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">Order {refund.order_id.slice(0, 8)}</p>
                          {refund.reason && <p className="text-xs text-muted-foreground mt-0.5 truncate">{refund.reason}</p>}
                          {refund.stripe_refund_id && <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{refund.stripe_refund_id}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(refund.created_at), "d MMM yyyy")}</p>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-sm font-semibold text-foreground">R{(refund.amount_cents / 100).toFixed(2)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            refund.status === "succeeded" ? "bg-green-500/10 text-green-500" :
                            refund.status === "failed" ? "bg-destructive/10 text-destructive" :
                            "bg-secondary text-muted-foreground"
                          }`}>{refund.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Bottom actions */}
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
