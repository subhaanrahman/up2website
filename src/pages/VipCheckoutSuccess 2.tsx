import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

const VipCheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const paymentIntentId = searchParams.get("payment_intent");

  const { data: reservation, isLoading } = useQuery({
    queryKey: ["vip-reservation-by-pi", paymentIntentId],
    queryFn: async () => {
      if (!paymentIntentId || !user) return null;
      const { data, error } = await supabase
        .from("vip_table_reservations")
        .select("*, events(title, event_date, location, venue_name, address), vip_table_tiers(name)")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!paymentIntentId && !!user,
    refetchInterval: (query) => {
      if (query.state.data?.status === "confirmed") return false;
      return 2000;
    },
  });

  const event = reservation?.events as any;
  const isConfirmed = reservation?.status === "confirmed";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">VIP Confirmation</h1>
        </div>
      </header>

      <main className="px-4 pt-6">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Confirming your VIP reservation...</p>
          </div>
        ) : !reservation ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">VIP reservation not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/events")}>View Events</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {isConfirmed ? "VIP Table Confirmed" : "Processing..."}
              </h2>
              <p className="text-muted-foreground">
                {isConfirmed ? "Your VIP reservation is confirmed" : "Your payment is being processed"}
              </p>
            </div>

            {event && (
              <div className="bg-card rounded-tile-sm p-4">
                <h3 className="font-semibold text-foreground text-lg capitalize">{event.title}</h3>
                {event.event_date && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(event.event_date), "EEEE, MMM d · h:mm a")}
                  </p>
                )}
                {(event.venue_name ?? event.location) && (
                  <p className="text-sm text-muted-foreground font-medium">{event.venue_name ?? event.location}</p>
                )}
                {event.address && (
                  <p className="text-sm text-muted-foreground">{event.address}</p>
                )}
              </div>
            )}

            <div className="bg-card rounded-tile-sm p-4">
              <h3 className="font-semibold text-foreground mb-3">Reservation Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier</span>
                  <span className="text-foreground">{reservation.vip_table_tiers?.name ?? "VIP Table"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guests</span>
                  <span className="text-foreground">{reservation.guest_count}</span>
                </div>
                {reservation.special_requests && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requests</span>
                    <span className="text-foreground truncate max-w-[150px]">{reservation.special_requests}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">R{((reservation.amount_cents - reservation.platform_fee_cents) / 100).toFixed(2)}</span>
                </div>
                {reservation.platform_fee_cents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="text-foreground">R{(reservation.platform_fee_cents / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">R{(reservation.amount_cents / 100).toFixed(2)} {reservation.currency.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pb-4">
              <Button className="w-full" onClick={() => navigate("/events")}>View My Tickets</Button>
              <Button variant="secondary" className="w-full" onClick={() => navigate("/")}>Back to Home</Button>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default VipCheckoutSuccess;
