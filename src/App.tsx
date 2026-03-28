import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { RouterErrorBoundary } from "@/components/RouterErrorBoundary";
import logoFull from "@/assets/logo-full.png";
import { PRODUCT_NAME } from "@/lib/brand";

const Home = lazy(() => import("./pages/Home"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Features = lazy(() => import("./pages/Features"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
    <div
      className="pointer-events-none absolute inset-0 opacity-30"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.35), transparent 70%), radial-gradient(ellipse 60% 40% at 100% 100%, hsl(280 35% 30% / 0.25), transparent 65%)",
      }}
      aria-hidden
    />
    <div className="relative flex flex-col items-center gap-6">
      <div className="relative">
        <div className="animate-route-load-breathe absolute inset-0 rounded-full bg-primary/20 blur-2xl" aria-hidden />
        <img src={logoFull} alt={PRODUCT_NAME} className="relative h-11 w-auto md:h-12" />
      </div>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  </div>
);

const App = () => (
  <TooltipProvider>
    <Sonner />
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <RouterErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/features" element={<Features />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </RouterErrorBoundary>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
