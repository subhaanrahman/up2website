import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Info, Loader2, ShieldCheck, RotateCcw, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { useOrderFlow } from "@/hooks/useOrderFlow";

interface CheckoutState {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  tierId: string;
  tierName: string;
  tierPriceCents: number;
  quantity: number;
  discountCode?: string;
}

/** Inner form rendered inside <Elements> once we have a clientSecret */
const CheckoutForm = ({
  state,
  amountCents,
}: {
  state: CheckoutState;
  amountCents: number;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  // amount_cents from server already includes service fee
  const total = amountCents / 100;
  const fees = total * (0.07 / 1.07); // back-calculate service fee from total
  const subtotal = total - fees;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if (error) {
      toast({
        title: "Payment failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      setProcessing(false);
    }
    // If successful, Stripe redirects to return_url — webhook handles confirmation
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-4">
      {/* Event Summary */}
      <div className="bg-card rounded-tile-sm p-4 mb-4">
        <h2 className="font-semibold text-foreground mb-1">{state.eventTitle}</h2>
        <p className="text-sm text-muted-foreground">{state.eventDate}</p>
        <p className="text-sm text-muted-foreground">{state.eventLocation}</p>
      </div>

      {/* Order Summary */}
      <div className="bg-card rounded-tile-sm p-4 mb-4">
        <h3 className="font-semibold text-foreground mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {state.tierName} × {state.quantity}
            </span>
            <span className="text-foreground">R{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Fee</span>
            <span className="text-foreground">R{fees.toFixed(2)}</span>
          </div>
          {state.discountCode && (
            <div className="flex justify-between text-primary">
              <span>Discount ({state.discountCode})</span>
              <span>-R0.00</span>
            </div>
          )}
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">R{total.toFixed(2)} ZAR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="bg-card rounded-tile-sm p-4 mb-6">
        <h3 className="font-semibold text-foreground mb-3">Payment</h3>
        <div className="mb-3 rounded-tile-sm border border-border bg-secondary/40 p-2.5">
          <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Secure
            </div>
            <div className="flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              Refund policy
            </div>
            <div className="flex items-center gap-1.5">
              <LifeBuoy className="h-3.5 w-3.5 text-primary" />
              24/7 support
            </div>
          </div>
        </div>
        <PaymentElement />
      </div>

      {/* Photo ID Notice */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-tile-sm mb-6">
        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Photo ID Required</p>
          <p className="text-muted-foreground">
            A valid photo ID is required for entry to all 18+ events.
          </p>
        </div>
      </div>

      {/* Purchase Button */}
      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold mb-4"
        disabled={!stripe || !elements || processing}
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Purchase – R${total.toFixed(2)}`
        )}
      </Button>

      {/* Legal Text */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed pb-4">
        By purchasing, you agree to our{" "}
        <span className="text-primary">Terms of Service</span> and{" "}
        <span className="text-primary">Purchase Terms</span>.{" "}
        <span className="text-primary">Privacy Policy</span> applies.
      </p>
    </form>
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { reserve, createPaymentIntent, clientSecret, error, loading } = useOrderFlow();

  const state = location.state as CheckoutState | null;
  const [amountCents, setAmountCents] = useState(0);
  const [initDone, setInitDone] = useState(false);

  // On mount: reserve → payment intent
  useEffect(() => {
    if (!state || initDone) return;
    setInitDone(true);

    (async () => {
      const order = await reserve({
        event_id: state.eventId,
        ticket_tier_id: state.tierId,
        quantity: state.quantity,
        currency: "zar",
      });
      if (!order) return;
      setAmountCents(order.amount_cents);
      await createPaymentIntent(order.id);
    })();
  }, [state, initDone]);

  useEffect(() => {
    if (error) {
      toast({ title: "Checkout Error", description: error, variant: "destructive" });
    }
  }, [error]);

  if (!state) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No checkout data found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Checkout" onBack={() => navigate(-1)} />

      {loading && !clientSecret ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Reserving your tickets...</span>
        </div>
      ) : clientSecret && stripePromise ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "night",
              variables: {
                colorPrimary: "#6366f1",
              },
            },
          }}
        >
          <CheckoutForm state={state} amountCents={amountCents} />
        </Elements>
      ) : error ? (
        <div className="px-4 pt-8 text-center">
          <p className="text-destructive font-medium mb-2">Could not start checkout</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
};

export default Checkout;
