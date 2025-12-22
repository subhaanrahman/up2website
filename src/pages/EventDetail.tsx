import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  Share2,
  Check,
  HelpCircle,
  X,
  MessageCircle,
  Send,
  Mail,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  end_date: string | null;
  cover_image: string | null;
  category: string | null;
  max_guests: number | null;
  host_id: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface RSVP {
  id: string;
  user_id: string;
  status: string;
  profiles: Profile;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: Profile;
}

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myRsvp, setMyRsvp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventData();
    }
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`event-messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_messages",
          filter: `event_id=eq.${id}`,
        },
        async (payload) => {
          // Fetch the profile for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .eq("user_id", payload.new.user_id)
            .single();

          const newMsg = {
            ...payload.new,
            profiles: profile,
          } as Message;

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const fetchEventData = async () => {
    if (!id) return;

    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (eventError || !eventData) {
        setLoading(false);
        return;
      }

      setEvent(eventData);

      // Fetch host profile
      const { data: hostData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("user_id", eventData.host_id)
        .maybeSingle();

      setHost(hostData);

      // Fetch RSVPs with profiles
      const { data: rsvpsData } = await supabase
        .from("rsvps")
        .select(`
          id,
          user_id,
          status,
          profiles (
            user_id,
            display_name,
            avatar_url
          )
        `)
        .eq("event_id", id);

      setRsvps((rsvpsData as any) || []);

      // Check if current user has RSVP'd
      if (user) {
        const userRsvp = rsvpsData?.find((r: any) => r.user_id === user.id);
        setMyRsvp(userRsvp?.status || null);
      }

      // Fetch messages if user is host or has RSVP'd
      if (user && (eventData.host_id === user.id || rsvpsData?.some((r: any) => r.user_id === user.id))) {
        const { data: messagesData } = await supabase
          .from("event_messages")
          .select(`
            id,
            content,
            created_at,
            user_id,
            profiles (
              user_id,
              display_name,
              avatar_url
            )
          `)
          .eq("event_id", id)
          .order("created_at", { ascending: true });

        setMessages((messagesData as any) || []);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (status: "going" | "maybe" | "not_going") => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to RSVP",
      });
      navigate("/auth");
      return;
    }

    if (!id) return;

    try {
      if (myRsvp) {
        // Update existing RSVP
        const { error } = await supabase
          .from("rsvps")
          .update({ status })
          .eq("event_id", id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Create new RSVP
        const { error } = await supabase
          .from("rsvps")
          .insert({ event_id: id, user_id: user.id, status });

        if (error) throw error;
      }

      setMyRsvp(status);
      toast({
        title: status === "going" ? "You're going!" : status === "maybe" ? "Marked as maybe" : "Declined",
        description: `You've updated your RSVP for ${event?.title}`,
      });

      // Refresh RSVPs
      fetchEventData();
    } catch (error) {
      console.error("Error updating RSVP:", error);
      toast({
        title: "Error",
        description: "Failed to update RSVP",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: event?.title,
        text: `Join me at ${event?.title}!`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Event link has been copied to clipboard",
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newMessage.trim()) return;

    const { error } = await supabase
      .from("event_messages")
      .insert({
        event_id: id,
        user_id: user.id,
        content: newMessage.trim(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !inviteEmail.trim()) return;

    setSendingInvite(true);

    const { error } = await supabase
      .from("invites")
      .insert({
        event_id: id,
        inviter_id: user.id,
        invitee_email: inviteEmail.trim(),
      });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Already invited",
          description: "This person has already been invited",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send invite",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invite sent!",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail("");
    }

    setSendingInvite(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 container mx-auto px-4 text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Event not found</h1>
          <Link to="/events">
            <Button variant="outline">Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const goingGuests = rsvps.filter((r) => r.status === "going");
  const maybeGuests = rsvps.filter((r) => r.status === "maybe");
  const isHost = user?.id === event.host_id;
  const canChat = isHost || myRsvp;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        {/* Hero Image */}
        <div className="relative h-[40vh] md:h-[50vh] bg-muted">
          {event.cover_image ? (
            <img
              src={event.cover_image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="h-24 w-24 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          <div className="absolute top-24 left-4 md:left-8">
            <Link to="/events">
              <Button variant="secondary" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-xl p-6 shadow-lg">
                {event.category && (
                  <Badge className="mb-4">{event.category}</Badge>
                )}
                <h1 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">
                  {event.title}
                </h1>
                
                {host && (
                  <div className="flex items-center gap-3 mb-6">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={host.avatar_url || undefined} />
                      <AvatarFallback>{host.display_name?.[0] || "H"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-muted-foreground">Hosted by</p>
                      <p className="font-medium text-card-foreground">{host.display_name || "Host"}</p>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(event.event_date), "h:mm a")}
                      </p>
                    </div>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background sm:col-span-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium text-foreground">{event.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {event.description && (
                  <div>
                    <h2 className="text-xl font-semibold text-card-foreground mb-3">About</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Tabs for Guests and Chat */}
              <Tabs defaultValue="guests" className="bg-card rounded-xl shadow-lg">
                <TabsList className="w-full border-b border-border rounded-t-xl rounded-b-none bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="guests"
                    className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Guests ({rsvps.length})
                  </TabsTrigger>
                  {canChat && (
                    <TabsTrigger
                      value="chat"
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat ({messages.length})
                    </TabsTrigger>
                  )}
                  {(isHost || myRsvp === "going") && (
                    <TabsTrigger
                      value="invite"
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Invite
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="guests" className="p-6 mt-0">
                  {goingGuests.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Going ({goingGuests.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {goingGuests.map((rsvp) => (
                          <div
                            key={rsvp.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={rsvp.profiles?.avatar_url || undefined} />
                              <AvatarFallback>
                                {rsvp.profiles?.display_name?.[0] || "G"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">
                              {rsvp.profiles?.display_name || "Guest"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {maybeGuests.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Maybe ({maybeGuests.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {maybeGuests.map((rsvp) => (
                          <div
                            key={rsvp.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={rsvp.profiles?.avatar_url || undefined} />
                              <AvatarFallback>
                                {rsvp.profiles?.display_name?.[0] || "G"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">
                              {rsvp.profiles?.display_name || "Guest"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rsvps.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No RSVPs yet. Be the first to join!
                    </p>
                  )}
                </TabsContent>

                {canChat && (
                  <TabsContent value="chat" className="p-6 mt-0">
                    <div className="h-64 overflow-y-auto space-y-3 mb-4">
                      {messages.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No messages yet. Start the conversation!
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div key={msg.id} className="flex gap-3">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                              <AvatarFallback>
                                {msg.profiles?.display_name?.[0] || "G"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-medium text-sm text-foreground">
                                  {msg.profiles?.display_name || "Guest"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(msg.created_at), "h:mm a")}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button type="submit" size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </TabsContent>
                )}

                {(isHost || myRsvp === "going") && (
                  <TabsContent value="invite" className="p-6 mt-0">
                    <form onSubmit={handleInvite} className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Invite friends to this event by email
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="friend@example.com"
                            className="flex-1"
                          />
                          <Button type="submit" disabled={sendingInvite}>
                            {sendingInvite ? "Sending..." : "Invite"}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Sidebar - RSVP Card */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl p-6 shadow-lg sticky top-24">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  Will you be attending?
                </h3>

                <div className="space-y-3 mb-6">
                  <Button
                    className="w-full gap-2"
                    variant={myRsvp === "going" ? "default" : "outline"}
                    onClick={() => handleRSVP("going")}
                  >
                    <Check className="h-4 w-4" />
                    I'm Going
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant={myRsvp === "maybe" ? "default" : "outline"}
                    onClick={() => handleRSVP("maybe")}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Maybe
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant={myRsvp === "not_going" ? "default" : "outline"}
                    onClick={() => handleRSVP("not_going")}
                  >
                    <X className="h-4 w-4" />
                    Can't Go
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share Event
                </Button>

                {event.max_guests && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Spots remaining</span>
                      <span className="font-medium text-foreground">
                        {Math.max(0, event.max_guests - goingGuests.length)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (goingGuests.length / event.max_guests) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventDetail;
