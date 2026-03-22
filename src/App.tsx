import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GamificationProvider } from "@/hooks/useGamification";
import { ActiveProfileProvider } from "@/contexts/ActiveProfileContext";
import PhoneFrame from "@/components/PhoneFrame";
import { RouterErrorBoundary } from "@/components/RouterErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import OnboardingRequired from "./pages/OnboardingRequired";
import EditEvent from "./pages/EditEvent";
import EventGuests from "./pages/EventGuests";
import Tickets from "./pages/Tickets";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import NotificationsSettings from "./pages/NotificationsSettings";
import PrivacySettings from "./pages/PrivacySettings";
import HelpCenter from "./pages/HelpCenter";
import About from "./pages/About";
import ManageAccount from "./pages/ManageAccount";
import ConnectMusic from "./pages/ConnectMusic";
import ContactUs from "./pages/ContactUs";
import Notifications from "./pages/Notifications";
import Checkout from "./pages/Checkout";
import VipCheckout from "./pages/VipCheckout";
import MessageThread from "./pages/MessageThread";
import DmThread from "./pages/DmThread";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import CreateOrganiserProfile from "./pages/CreateOrganiserProfile";
import EditOrganiserProfile from "./pages/EditOrganiserProfile";
import OrganiserTeam from "./pages/OrganiserTeam";
import FriendsFollowing from "./pages/FriendsFollowing";
import Followers from "./pages/Followers";
import ManageEvent from "./pages/ManageEvent";
import EventCheckIn from "./pages/EventCheckIn";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import EmailVerification from "./pages/EmailVerification";
import EventAnalytics from "./pages/EventAnalytics";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import VipCheckoutSuccess from "./pages/VipCheckoutSuccess";
import PaymentMethods from "./pages/PaymentMethods";
import EventEmbed from "./pages/EventEmbed";
import BlockedUsers from "./pages/BlockedUsers";
import MusicCallback from "./pages/MusicCallback";
import DigitalIdSettings from "./pages/DigitalIdSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data \"fresh\" for a short window so navigating back/forth
      // (e.g. Messages ↔️ Notifications) doesn't refetch and block the UI
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

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
            <RouterErrorBoundary>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/search" element={<Events />} />
              <Route path="/search/:id" element={<EventDetail />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/embed/:id" element={<EventEmbed />} />
              <Route path="/events/:id/edit" element={<ProtectedRoute><EditEvent /></ProtectedRoute>} />
              <Route path="/events/:id/guests" element={<EventGuests />} />
              <Route path="/events/:id/manage" element={<ProtectedRoute><ManageEvent /></ProtectedRoute>} />
              <Route path="/events/:id/checkin" element={<ProtectedRoute><EventCheckIn /></ProtectedRoute>} />
              <Route path="/events/:id/analytics" element={<ProtectedRoute><EventAnalytics /></ProtectedRoute>} />

              {/* Protected routes */}
              <Route path="/messages" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/messages/dm/:id" element={<ProtectedRoute><DmThread /></ProtectedRoute>} />
              <Route path="/messages/:id" element={<ProtectedRoute><MessageThread /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
              <Route path="/profile/create-organiser" element={<ProtectedRoute><CreateOrganiserProfile /></ProtectedRoute>} />
              <Route path="/profile/edit-organiser" element={<ProtectedRoute><EditOrganiserProfile /></ProtectedRoute>} />
              <Route path="/profile/organiser-team" element={<ProtectedRoute><OrganiserTeam /></ProtectedRoute>} />
              <Route path="/profile/friends" element={<ProtectedRoute><FriendsFollowing /></ProtectedRoute>} />
              <Route path="/profile/followers" element={<ProtectedRoute><Followers /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
              <Route path="/create/onboarding-required" element={<ProtectedRoute><OnboardingRequired /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/notifications" element={<ProtectedRoute><NotificationsSettings /></ProtectedRoute>} />
              <Route path="/settings/privacy" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
              <Route path="/settings/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
              <Route path="/settings/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
              <Route path="/settings/account" element={<ProtectedRoute><ManageAccount /></ProtectedRoute>} />
              <Route path="/settings/music" element={<ProtectedRoute><ConnectMusic /></ProtectedRoute>} />
              <Route path="/settings/music/callback" element={<ProtectedRoute><MusicCallback /></ProtectedRoute>} />
              <Route path="/settings/contact" element={<ProtectedRoute><ContactUs /></ProtectedRoute>} />
              <Route path="/settings/email-verification" element={<ProtectedRoute><EmailVerification /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
              <Route path="/vip-checkout" element={<ProtectedRoute><VipCheckout /></ProtectedRoute>} />
              <Route path="/vip-checkout/success" element={<ProtectedRoute><VipCheckoutSuccess /></ProtectedRoute>} />
              <Route path="/settings/payment-methods" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
              <Route path="/settings/blocked-users" element={<ProtectedRoute><BlockedUsers /></ProtectedRoute>} />
              <Route path="/settings/digital-id" element={<ProtectedRoute><DigitalIdSettings /></ProtectedRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </RouterErrorBoundary>
          </PhoneFrame>
        </BrowserRouter>
        </TooltipProvider>
      </GamificationProvider>
      </ActiveProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
