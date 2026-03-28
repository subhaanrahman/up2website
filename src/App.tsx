import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { RouterErrorBoundary } from "@/components/RouterErrorBoundary";

const Home = lazy(() => import("./pages/Home"));
const Solutions = lazy(() => import("./pages/Solutions"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Features = lazy(() => import("./pages/Features"));
const Contact = lazy(() => import("./pages/Contact"));
const Pricing = lazy(() => import("./pages/Pricing"));
const FAQ = lazy(() => import("./pages/FAQ"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
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
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/features" element={<Features />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </RouterErrorBoundary>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
