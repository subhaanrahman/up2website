import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Ticket, ClipboardList, Bell, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useCreateEvent } from "@/hooks/useEventsQuery";
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import EventDetailsForm, { type CohostEntry } from "@/components/create-event/EventDetailsForm";
import TicketingPanel from "@/components/create-event/TicketingPanel";
import GuestlistPanel from "@/components/create-event/GuestlistPanel";
import NotificationsPanel from "@/components/create-event/NotificationsPanel";
import type { TicketTier } from "@/components/create-event/TicketTierModal";
import type { DiscountCode } from "@/components/create-event/DiscountCodeModal";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BottomTab = "details" | "ticketing" | "guestlist" | "notifications";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const { activeProfile, isOrganiser, organiserProfiles, isLoading: profileLoading } = useActiveProfile();
  const createEventMutation = useCreateEvent();

  const [activeTab, setActiveTab] = useState<BottomTab>("details");
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [publishAt, setPublishAt] = useState("");

  // Details state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [cohosts, setCohosts] = useState<CohostEntry[]>([]);
  const [cohostInput, setCohostInput] = useState("");

  // Ticketing state
  const [capacity, setCapacity] = useState("");
  const [showRemaining, setShowRemaining] = useState(false);
  const [discountsEnabled, setDiscountsEnabled] = useState(false);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [ticketsAvailableFrom, setTicketsAvailableFrom] = useState("");
  const [soldOutMessageEnabled, setSoldOutMessageEnabled] = useState(false);
  const [soldOutMessage, setSoldOutMessage] = useState("");

  // Guestlist state
  const [guestlistEnabled, setGuestlistEnabled] = useState(true);
  const [guestlistDeadline, setGuestlistDeadline] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [guestlistCapacity, setGuestlistCapacity] = useState("");

  // Notifications state
  const [reminders, setReminders] = useState<string[]>(["1_day"]);

  // Ticketing is only available when actively using a business (organiser) profile
  const hasOrganiserProfile = isOrganiser;

  // Check if the active organiser has Stripe Connect set up for paid tickets
  const activeOrgId = isOrganiser ? activeProfile?.id : undefined;
  const { data: connectStatus } = useStripeConnectStatus(activeOrgId);
  const payoutsReady = connectStatus?.charges_enabled ?? false;

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to create an event" });
      navigate("/auth");
    }
  }, [user, loading, profileLoading, navigate, toast]);

  const hasData = title || date || location || description;

  const handleClose = () => {
    if (hasData) {
      setExitDialogOpen(true);
    } else {
      navigate(-1);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !title) {
      navigate(-1);
      return;
    }

    const eventDateTime = time ? `${date || new Date().toISOString().split("T")[0]}T${time}:00` : `${date || new Date().toISOString().split("T")[0]}T00:00:00`;

    const orgProfileId = organiserProfiles.length > 0 ? organiserProfiles[0]?.id : undefined;

    try {
      await createEventMutation.mutateAsync({
        title: title || "Untitled Event",
        description: description || undefined,
        location: location || undefined,
        eventDate: eventDateTime,
        category: category || "party",
        maxGuests: capacity ? parseInt(capacity) : undefined,
        isPublic: false, // draft events are private
        organiserProfileId: orgProfileId,
      });
      toast({ title: "Draft saved", description: "Your event has been saved as a draft." });
      navigate(-1);
    } catch {
      toast({ title: "Error", description: "Failed to save draft.", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to create an event", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!title || !date || !location) {
      toast({ title: "Missing information", description: "Please fill in title, date, and location", variant: "destructive" });
      setActiveTab("details");
      return;
    }

    const eventDateTime = time ? `${date}T${time}:00` : `${date}T00:00:00`;

    // Use the active organiser profile if available (business accounts only)
    const orgProfileId = activeProfile?.type === "organiser"
      ? activeProfile.id
      : organiserProfiles.length > 0 ? organiserProfiles[0]?.id : undefined;

    try {
      const data = await createEventMutation.mutateAsync({
        title,
        description: description || undefined,
        location,
        eventDate: eventDateTime,
        category: category || "party",
        maxGuests: capacity ? parseInt(capacity) : undefined,
        organiserProfileId: orgProfileId,
        publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
      });

      toast({
        title: publishAt ? "Event scheduled!" : "Event created!",
        description: publishAt ? "Your event will publish at the scheduled time." : "Your event has been created successfully.",
      });
      navigate(`/events/${(data as any).id}`);
    } catch {
      toast({ title: "Error", description: "Failed to create event. Please try again.", variant: "destructive" });
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const tabs: { key: BottomTab; label: string; icon: React.ReactNode }[] = [
    // Only business (organiser) accounts can access ticketing
    ...(hasOrganiserProfile ? [{ key: "ticketing" as BottomTab, label: "Ticketing", icon: <Ticket className="h-5 w-5" /> }] : []),
    { key: "guestlist", label: "Guestlist", icon: <ClipboardList className="h-5 w-5" /> },
    { key: "notifications", label: "Notifications", icon: <Bell className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">New Event</h1>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={createEventMutation.isPending}
            className="h-9 px-4 text-sm"
          >
            {createEventMutation.isPending ? "..." : "Create"}
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="container mx-auto px-4 max-w-lg py-5">
          {activeTab === "details" && (
            <EventDetailsForm
              title={title} setTitle={setTitle}
              date={date} setDate={setDate}
              time={time} setTime={setTime}
              location={location} setLocation={setLocation}
              description={description} setDescription={setDescription}
              category={category} setCategory={setCategory}
              selectedGenres={selectedGenres} setSelectedGenres={setSelectedGenres}
              selectedStyles={selectedStyles} setSelectedStyles={setSelectedStyles}
              selectedVibes={selectedVibes} setSelectedVibes={setSelectedVibes}
              cohosts={cohosts} setCohosts={setCohosts}
              cohostInput={cohostInput} setCohostInput={setCohostInput}
            />
          )}
          {activeTab === "ticketing" && (
            <TicketingPanel
              capacity={capacity} setCapacity={setCapacity}
              showRemaining={showRemaining} setShowRemaining={setShowRemaining}
              discountsEnabled={discountsEnabled} setDiscountsEnabled={setDiscountsEnabled}
              discountCodes={discountCodes} setDiscountCodes={setDiscountCodes}
              ticketTiers={ticketTiers} setTicketTiers={setTicketTiers}
              ticketsAvailableFrom={ticketsAvailableFrom} setTicketsAvailableFrom={setTicketsAvailableFrom}
              soldOutMessageEnabled={soldOutMessageEnabled} setSoldOutMessageEnabled={setSoldOutMessageEnabled}
              soldOutMessage={soldOutMessage} setSoldOutMessage={setSoldOutMessage}
              payoutsReady={payoutsReady}
            />
          )}
          {activeTab === "guestlist" && (
            <GuestlistPanel
              guestlistEnabled={guestlistEnabled} setGuestlistEnabled={setGuestlistEnabled}
              guestlistDeadline={guestlistDeadline} setGuestlistDeadline={setGuestlistDeadline}
              requireApproval={requireApproval} setRequireApproval={setRequireApproval}
              guestlistCapacity={guestlistCapacity} setGuestlistCapacity={setGuestlistCapacity}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsPanel reminders={reminders} setReminders={setReminders} />
          )}

          {/* Create + Schedule buttons on details tab */}
          {activeTab === "details" && (
            <div className="pt-6 space-y-3">
              {/* Schedule option */}
              <div className="space-y-2">
                <Label className="text-foreground text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Schedule Publishing (optional)
                </Label>
                <Input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  className="h-12 bg-card border-border"
                  placeholder="Leave empty to publish immediately"
                />
                {publishAt && (
                  <p className="text-xs text-muted-foreground">
                    Event will auto-publish at the selected time
                  </p>
                )}
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full h-14 text-lg"
                disabled={createEventMutation.isPending}
                onClick={handleSubmit}
              >
                {createEventMutation.isPending ? "Creating..." : publishAt ? "Schedule Event" : "Create Event"}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Tab Bar - replaces regular nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Exit dialog */}
      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Save as draft?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You have unsaved changes. Would you like to save this event as a draft?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate(-1)} className="border-border">Discard</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveDraft}>Save Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreateEvent;
