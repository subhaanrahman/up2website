import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/infrastructure/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import BottomNav from "@/components/BottomNav";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const paymentIntentId = searchParams.get("payment_intent");

  // Fetch the order using stripe_payment_intent_id
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order-by-pi", paymentIntentId],
    queryFn: async () => {
      if (!paymentIntentId || !user) return null;
      const { data, error } = await supabase
        .from("orders")
        .select("*, events(title, event_date, location, venue_name, address)")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!paymentIntentId && !!user,
    refetchInterval: (query) => {
      // Poll until order is confirmed
      if (query.state.data?.status === "confirmed") return false;
      return 2000;
    },
  });

  // Fetch tickets for this order
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-by-order", order?.id],
    queryFn: async () => {
      if (!order?.id) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("*, ticket_tiers(name)")
        .eq("order_id", order.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!order?.id,
  });

  const event = order?.events as any;
  const isConfirmed = order?.status === "confirmed";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Order Confirmation</h1>
        </div>
      </header>

      <main className="px-4 pt-6">
        {orderLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Confirming your order...</p>
          </div>
        ) : !order ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Order not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/events")}>
              View My Tickets
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {isConfirmed ? "You're In!" : "Processing..."}
              </h2>
              <p className="text-muted-foreground">
                {isConfirmed
                  ? "Your tickets are confirmed"
                  : "Your payment is being processed"}
              </p>
            </div>

            {/* Event Info */}
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

            {/* Order Details */}
            <div className="bg-card rounded-tile-sm p-4">
              <h3 className="font-semibold text-foreground mb-3">Order Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="text-foreground">{order.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">R{((order.amount_cents - order.platform_fee_cents) / 100).toFixed(2)}</span>
                  </div>
                  {order.platform_fee_cents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Fee</span>
                      <span className="text-foreground">R{(order.platform_fee_cents / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">
                        R{(order.amount_cents / 100).toFixed(2)} {order.currency.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
            </div>

            {/* QR Codes */}
            {tickets.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Your Tickets</h3>
                {tickets.map((ticket: any, idx: number) => (
                  <div key={ticket.id} className="bg-card rounded-tile-sm p-4 flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      {ticket.ticket_tiers?.name || `Ticket ${idx + 1}`}
                    </p>
                    <div className="bg-background p-4 rounded-lg">
                      <QRCodeSVG
                        value={ticket.qr_code}
                        size={180}
                        bgColor="transparent"
                        fgColor="currentColor"
                        className="text-foreground"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      {ticket.qr_code.slice(0, 16)}...
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pb-4">
              <Button className="w-full" onClick={() => navigate("/events")}>
                View My Tickets
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => navigate("/")}>
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default CheckoutSuccess;
