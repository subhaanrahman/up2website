import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GamificationProvider } from "@/hooks/useGamification";
import { ActiveProfileProvider } from "@/contexts/ActiveProfileContext";
import PhoneFrame from "@/components/PhoneFrame";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import MessageThread from "./pages/MessageThread";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import CreateOrganiserProfile from "./pages/CreateOrganiserProfile";
import EditOrganiserProfile from "./pages/EditOrganiserProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ActiveProfileProvider>
      <GamificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <PhoneFrame>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/search" element={<Events />} />
              <Route path="/search/:id" element={<EventDetail />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/events/:id" element={<EventDetail />} />

              {/* Protected routes */}
              <Route path="/messages" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/messages/:id" element={<ProtectedRoute><MessageThread /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
              <Route path="/profile/create-organiser" element={<ProtectedRoute><CreateOrganiserProfile /></ProtectedRoute>} />
              <Route path="/profile/edit-organiser" element={<ProtectedRoute><EditOrganiserProfile /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/notifications" element={<ProtectedRoute><NotificationsSettings /></ProtectedRoute>} />
              <Route path="/settings/privacy" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
              <Route path="/settings/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
              <Route path="/settings/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PhoneFrame>
        </BrowserRouter>
        </TooltipProvider>
      </GamificationProvider>
      </ActiveProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
