import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const PaymentMethods = () => {
  const navigate = useNavigate();

  // Stripe payment methods would be fetched via an edge function
  // For now, show a placeholder state
  const [methods] = useState<any[]>([]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 py-4 relative">
          <h1 className="text-xl font-bold text-foreground text-center">PAYMENT METHODS</h1>
          <button onClick={() => navigate(-1)} className="absolute left-2 p-2 -ml-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-6">
        {methods.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No Payment Methods</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Payment methods will be saved automatically when you purchase tickets.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method: any) => (
              <div key={method.id} className="bg-card rounded-xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">•••• {method.last4}</p>
                  <p className="text-sm text-muted-foreground">{method.brand} · Expires {method.expMonth}/{method.expYear}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default PaymentMethods;
