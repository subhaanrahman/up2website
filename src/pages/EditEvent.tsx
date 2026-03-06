import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, MapPin, Clock, X, Trash2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/useEventsQuery";
import { format } from "date-fns";

const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  const [formData, setFormData] = useState({
    title: "", description: "", date: "", time: "", location: "", category: "", capacity: "",
  });

  useEffect(() => {
    if (event) {
      const d = new Date(event.eventDate);
      setFormData({
        title: event.title,
        description: event.description || "",
        date: format(d, "yyyy-MM-dd"),
        time: format(d, "HH:mm"),
        location: event.location || "",
        category: event.category || "",
        capacity: event.maxGuests?.toString() || "",
      });
    }
  }, [event]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (event && user && event.hostId !== user.id) {
      toast({ title: "Not authorized", description: "You can only edit your own events", variant: "destructive" });
      navigate(`/events/${id}`);
    }
  }, [event, user, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !formData.title || !formData.date || !formData.location) {
      toast({ title: "Missing information", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const eventDateTime = formData.time ? `${formData.date}T${formData.time}:00` : `${formData.date}T00:00:00`;

    try {
      await updateMutation.mutateAsync({
        id,
        title: formData.title,
        description: formData.description || undefined,
        location: formData.location,
        eventDate: eventDateTime,
        category: formData.category || undefined,
        maxGuests: formData.capacity ? parseInt(formData.capacity) : undefined,
      });
      toast({ title: "Event updated!", description: "Your changes have been saved." });
      navigate(`/events/${id}`);
    } catch {
      toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Event deleted", description: "Your event has been removed." });
      navigate("/events");
    } catch {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isLoading || authLoading) {
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
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Edit Event</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="pt-4 md:pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-lg md:max-w-2xl">
          <div className="hidden md:block text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Edit Event</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">Event Title *</Label>
              <Input id="title" name="title" value={formData.title} onChange={handleChange} className="h-12 md:h-auto text-base bg-card border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} className="bg-card border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2 text-foreground"><Calendar className="h-4 w-4 text-primary" /> Date *</Label>
                <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} className="h-12 md:h-auto bg-card border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2 text-foreground"><Clock className="h-4 w-4 text-primary" /> Time</Label>
                <Input id="time" name="time" type="time" value={formData.time} onChange={handleChange} className="h-12 md:h-auto bg-card border-border" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2 text-foreground"><MapPin className="h-4 w-4 text-primary" /> Location *</Label>
              <Input id="location" name="location" value={formData.location} onChange={handleChange} className="h-12 md:h-auto bg-card border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-foreground">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="h-12 md:h-auto bg-card border-border"><SelectValue placeholder="Select" /></SelectTrigger>
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
                <Input id="capacity" name="capacity" type="number" value={formData.capacity} onChange={handleChange} className="h-12 md:h-auto bg-card border-border" />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="lg" className="w-full h-14 text-lg">
                    <Trash2 className="h-5 w-5 mr-2" /> Delete Event
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. All RSVPs and event data will be permanently removed.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default EditEvent;
