import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GamificationProvider } from "@/hooks/useGamification";
import PhoneFrame from "@/components/PhoneFrame";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import Tickets from "./pages/Tickets";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import NotificationsSettings from "./pages/NotificationsSettings";
import PrivacySettings from "./pages/PrivacySettings";
import HelpCenter from "./pages/HelpCenter";
import About from "./pages/About";
import Notifications from "./pages/Notifications";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GamificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <PhoneFrame>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/messages" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/search" element={<Events />} />
              <Route path="/search/:id" element={<EventDetail />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/create" element={<CreateEvent />} />
              <Route path="/events" element={<Tickets />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/notifications" element={<NotificationsSettings />} />
              <Route path="/settings/privacy" element={<PrivacySettings />} />
              <Route path="/settings/help" element={<HelpCenter />} />
              <Route path="/settings/about" element={<About />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/checkout" element={<Checkout />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PhoneFrame>
        </BrowserRouter>
        </TooltipProvider>
      </GamificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
