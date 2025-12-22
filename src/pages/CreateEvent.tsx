import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Calendar, MapPin, Clock, Image, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
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
    }
  }, [user, loading, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create an event",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Validate form
    if (!formData.title || !formData.date || !formData.location) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    // Combine date and time
    const eventDateTime = formData.time 
      ? `${formData.date}T${formData.time}:00`
      : `${formData.date}T00:00:00`;

    const { data, error } = await supabase
      .from("events")
      .insert({
        host_id: user.id,
        title: formData.title,
        description: formData.description || null,
        location: formData.location,
        event_date: eventDateTime,
        category: formData.category || "party",
        max_guests: formData.capacity ? parseInt(formData.capacity) : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Event created!",
        description: "Your event has been created successfully.",
      });
      navigate(`/events/${data.id}`);
    }

    setSubmitting(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Create Event</span>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Plan your next event
            </h1>
            <p className="text-muted-foreground">
              Fill in the details below to create a beautiful invite
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card rounded-xl p-6 shadow-lg space-y-6">
              {/* Event Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Summer Garden Party"
                  value={formData.title}
                  onChange={handleChange}
                  className="text-lg"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Tell your guests what to expect..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                />
              </div>

              {/* Date & Time */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Date *
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Time
                  </Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Location *
                </Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g., 123 Main St, Brooklyn, NY"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              {/* Category & Capacity */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birthday">🎂 Birthday</SelectItem>
                      <SelectItem value="dinner">🍽️ Dinner</SelectItem>
                      <SelectItem value="wedding">💒 Wedding</SelectItem>
                      <SelectItem value="party">🎉 Party</SelectItem>
                      <SelectItem value="social">🍸 Social</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Guest Capacity</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.capacity}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Cover Image Upload Area */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />
                  Cover Image
                </Label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Image className="h-10 w-10" />
                    <p>Click to upload or drag and drop</p>
                    <p className="text-sm">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full text-lg"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Event"}
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateEvent;
