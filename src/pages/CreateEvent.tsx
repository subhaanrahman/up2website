import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Ticket, ClipboardList, Bell, FileText } from "lucide-react";
import { DateTimePicker } from "@/components/create-event/DateTimePicker";
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
  const [formErrors, setFormErrors] = useState<{ title?: string; date?: string; location?: string }>({});

  // Details state
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
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
        maxGuests: capacity ? parseInt(capacity) : undefined,
        isPublic: false, // draft events are private
        coverImage: coverImage || undefined,
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
      setFormErrors({
        title: !title ? "Event title is required" : undefined,
        date: !date ? "Date is required" : undefined,
        location: !location ? "Location is required" : undefined,
      });
      setActiveTab("details");
      return;
    }
    setFormErrors({});

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
        maxGuests: capacity ? parseInt(capacity) : undefined,
        coverImage: coverImage || undefined,
        organiserProfileId: orgProfileId,
        publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
      });

      const eventId = (data as any).id;

      // Save cohosts to event_cohosts table
      if (cohosts.length > 0 && eventId) {
        const cohostRows = cohosts.map(c => ({
          event_id: eventId,
          organiser_profile_id: c.type === "organiser" ? c.id : null,
          user_id: c.type === "personal" ? c.id : null,
          role: "cohost",
        }));
        await supabase.from("event_cohosts").insert(cohostRows);
      }

      // Save reminder preferences to event_reminders table
      if (reminders.length > 0 && eventId) {
        await supabase.from("event_reminders").insert(
          reminders.map(r => ({ event_id: eventId, reminder_type: r, is_enabled: true }))
        );
      }

      toast({
        title: publishAt ? "Event scheduled!" : "Event created!",
        description: publishAt ? "Your event will publish at the scheduled time." : "Your event has been created successfully.",
      });
      navigate(`/events/${eventId}`);
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
    <div className="min-h-screen bg-background flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase">New Event</h1>
          <span className="w-9" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="container mx-auto px-4 max-w-lg py-5">
          {activeTab === "details" && (
            <EventDetailsForm
              title={title} setTitle={setTitle}
              coverImage={coverImage} setCoverImage={setCoverImage}
              date={date} setDate={setDate}
              time={time} setTime={setTime}
              location={location} setLocation={setLocation}
              description={description} setDescription={setDescription}
              cohosts={cohosts} setCohosts={setCohosts}
              cohostInput={cohostInput} setCohostInput={setCohostInput}
              errors={formErrors}
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

          {/* Schedule + publish on details tab */}
          {activeTab === "details" && (
            <div className="pt-3 space-y-3">
              <DateTimePicker
                value={publishAt}
                onChange={setPublishAt}
                label="Schedule Publishing"
                helperText="Leave empty to publish immediately"
                helperTextActive="Event will auto-publish at this time"
              />
              <Button
                type="button"
                className="w-full h-12 rounded-2xl font-bold tracking-widest text-sm"
                disabled={createEventMutation.isPending}
                onClick={handleSubmit}
              >
                {createEventMutation.isPending ? "CREATING…" : publishAt ? "SCHEDULE EVENT" : "CREATE EVENT"}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="no-press fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border/50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${activeTab === "details" ? "text-primary" : "text-muted-foreground"}`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Details</span>
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
                activeTab === tab.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-bold tracking-widest uppercase">{tab.label}</span>
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
