import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { GamificationProvider } from "@/hooks/useGamification";
import { ActiveProfileProvider } from "@/contexts/ActiveProfileContext";
import PhoneFrame from "@/components/PhoneFrame";
import { RouterErrorBoundary } from "@/components/RouterErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";

const Index = lazy(() => import("./pages/Index"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const OnboardingRequired = lazy(() => import("./pages/OnboardingRequired"));
const EditEvent = lazy(() => import("./pages/EditEvent"));
const EventGuests = lazy(() => import("./pages/EventGuests"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const NotificationsSettings = lazy(() => import("./pages/NotificationsSettings"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const About = lazy(() => import("./pages/About"));
const ManageAccount = lazy(() => import("./pages/ManageAccount"));
const ConnectMusic = lazy(() => import("./pages/ConnectMusic"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Checkout = lazy(() => import("./pages/Checkout"));
const MessageThread = lazy(() => import("./pages/MessageThread"));
const DmThread = lazy(() => import("./pages/DmThread"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CreateOrganiserProfile = lazy(() => import("./pages/CreateOrganiserProfile"));
const EditOrganiserProfile = lazy(() => import("./pages/EditOrganiserProfile"));
const OrganiserTeam = lazy(() => import("./pages/OrganiserTeam"));
const FriendsFollowing = lazy(() => import("./pages/FriendsFollowing"));
const ManageEvent = lazy(() => import("./pages/ManageEvent"));
const EventCheckIn = lazy(() => import("./pages/EventCheckIn"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const EventAnalytics = lazy(() => import("./pages/EventAnalytics"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const EventEmbed = lazy(() => import("./pages/EventEmbed"));
const BlockedUsers = lazy(() => import("./pages/BlockedUsers"));
const MusicCallback = lazy(() => import("./pages/MusicCallback"));
const VipCheckout = lazy(() => import("./pages/VipCheckout"));
const VipCheckoutSuccess = lazy(() => import("./pages/VipCheckoutSuccess"));
const Followers = lazy(() => import("./pages/Followers"));
const DigitalIdSettings = lazy(() => import("./pages/DigitalIdSettings"));

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

const RouteFallback = () => {
  const { pathname } = useLocation();
  const hideBottomNav =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/embed/");

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center ${hideBottomNav ? "" : "pb-20"}`}>
      <div className="text-sm text-muted-foreground animate-pulse">Loading...</div>
      {!hideBottomNav ? <BottomNav /> : null}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ActiveProfileProvider>
      <GamificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <PhoneFrame>
            <RouterErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
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
            </Suspense>
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
