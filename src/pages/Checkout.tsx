import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CreditCard, Apple, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

interface CheckoutState {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  tierName: string;
  tierPrice: number;
  quantity: number;
  discountCode?: string;
}

const paymentMethods = [
  { id: "card", label: "Credit / Debit Card", icon: CreditCard },
  { id: "apple", label: "Apple Pay", icon: Apple },
];

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const state = location.state as CheckoutState | null;
  const [selectedPayment, setSelectedPayment] = useState("card");
  const [processing, setProcessing] = useState(false);

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

  const subtotal = state.tierPrice * state.quantity;
  const fees = subtotal * 0.1;
  const total = subtotal + fees;

  const handlePurchase = async () => {
    setProcessing(true);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "Purchase complete!",
      description: `You're going to ${state.eventTitle}`,
    });
    
    navigate("/events");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Checkout</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Event Summary */}
        <div className="bg-card rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-1">{state.eventTitle}</h2>
          <p className="text-sm text-muted-foreground">{state.eventDate}</p>
          <p className="text-sm text-muted-foreground">{state.eventLocation}</p>
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-foreground mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {state.tierName} × {state.quantity}
              </span>
              <span className="text-foreground">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Fee</span>
              <span className="text-foreground">${fees.toFixed(2)}</span>
            </div>
            {state.discountCode && (
              <div className="flex justify-between text-primary">
                <span>Discount ({state.discountCode})</span>
                <span>-$0.00</span>
              </div>
            )}
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">${total.toFixed(2)} USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-card rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-foreground mb-3">Payment Method</h3>
          <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary/50"
              >
                <RadioGroupItem value={method.id} id={method.id} />
                <method.icon className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor={method.id} className="flex-1 cursor-pointer text-foreground">
                  {method.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Photo ID Notice */}
        <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl mb-6">
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
          className="w-full h-12 text-base font-semibold mb-4"
          onClick={handlePurchase}
          disabled={processing}
        >
          {processing ? "Processing..." : `Purchase – $${total.toFixed(2)}`}
        </Button>

        {/* Legal Text */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          By purchasing, you agree to our{" "}
          <span className="text-primary">Terms of Service</span> and{" "}
          <span className="text-primary">Purchase Terms</span>.{" "}
          <span className="text-primary">Privacy Policy</span> applies.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Checkout;
