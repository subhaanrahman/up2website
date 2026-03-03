import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Clock, Image, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useCreateEvent } from "@/hooks/useEventsQuery";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const { isOrganiser } = useActiveProfile();
  const createEventMutation = useCreateEvent();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    category: "",
    capacity: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create an event",
      });
      navigate("/auth");
    } else if (!loading && user && !isOrganiser) {
      toast({
        title: "Organiser account required",
        description: "Switch to an organiser profile to create events.",
        variant: "destructive",
      });
      navigate("/profile");
    }
  }, [user, loading, isOrganiser, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to create an event", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!formData.title || !formData.date || !formData.location) {
      toast({ title: "Missing information", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const eventDateTime = formData.time 
      ? `${formData.date}T${formData.time}:00`
      : `${formData.date}T00:00:00`;

    try {
      const data = await createEventMutation.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        location: formData.location,
        eventDate: eventDateTime,
        category: formData.category || 'party',
        maxGuests: formData.capacity ? parseInt(formData.capacity) : undefined,
      });

      toast({ title: "Event created!", description: "Your event has been created successfully." });
      navigate(`/events/${(data as any).id}`);
    } catch (error) {
      console.error("Error creating event:", error);
      toast({ title: "Error", description: "Failed to create event. Please try again.", variant: "destructive" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">New Event</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="pt-4 md:pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-lg md:max-w-2xl">
          <div className="hidden md:block text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Create Event</h1>
            <p className="text-muted-foreground">Fill in the details below to create a beautiful invite</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">Event Title *</Label>
              <Input id="title" name="title" placeholder="e.g., Summer Garden Party" value={formData.title} onChange={handleChange} className="h-12 md:h-auto text-base bg-card border-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea id="description" name="description" placeholder="Tell your guests what to expect..." value={formData.description} onChange={handleChange} rows={3} className="bg-card border-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2 text-foreground">
                  <Calendar className="h-4 w-4 text-primary" /> Date *
                </Label>
                <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} className="h-12 md:h-auto bg-card border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary" /> Time
                </Label>
                <Input id="time" name="time" type="time" value={formData.time} onChange={handleChange} className="h-12 md:h-auto bg-card border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-primary" /> Location *
              </Label>
              <Input id="location" name="location" placeholder="e.g., 123 Main St, Brooklyn, NY" value={formData.location} onChange={handleChange} className="h-12 md:h-auto bg-card border-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-foreground">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="h-12 md:h-auto bg-card border-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="birthday">🎂 Birthday</SelectItem>
                    <SelectItem value="dinner">🍽️ Dinner</SelectItem>
                    <SelectItem value="wedding">💒 Wedding</SelectItem>
                    <SelectItem value="party">🎉 Party</SelectItem>
                    <SelectItem value="social">🍸 Social</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-foreground">Capacity</Label>
                <Input id="capacity" name="capacity" type="number" placeholder="e.g., 50" value={formData.capacity} onChange={handleChange} className="h-12 md:h-auto bg-card border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground">
                <Image className="h-4 w-4 text-primary" /> Cover Image
              </Label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 md:p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-card">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Image className="h-8 w-8" />
                  <p className="text-sm">Tap to upload</p>
                  <p className="text-xs">PNG, JPG up to 10MB</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default CreateEvent;
