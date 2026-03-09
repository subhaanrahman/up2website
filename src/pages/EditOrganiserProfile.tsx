import { useEffect, useState } from "react";
import PayoutSetupSection from "@/components/PayoutSetupSection";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { CITIES } from "@/data/cities";
import { ArrowLeft, Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["Venue", "Event"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TAG_SUGGESTIONS = {
  genre: ["House", "Techno", "Hip Hop", "R&B", "Afrobeats", "Amapiano", "Deep House", "Jazz", "Indie", "Pop", "Rock", "Latin", "Reggaeton", "Drum & Bass"],
  crowd: ["Young Professionals", "Students", "Over 25s", "Mixed", "LGBTQ+ Friendly", "Upscale", "Underground", "Casual"],
  features: ["Outdoor Area", "Rooftop", "Dance Floor", "VIP Section", "Smoking Area", "Free Parking", "Pool", "Live Music", "DJ Booth", "Food Menu", "Cocktail Bar", "Bottle Service"],
};

const EditOrganiserProfile = () => {
  const navigate = useNavigate();
  const { activeProfile, isOrganiser, organiserProfiles, refetchOrganiserProfiles } = useActiveProfile();
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");

  const activeOrg = isOrganiser
    ? organiserProfiles.find((o) => o.id === activeProfile?.id)
    : undefined;

  const [formData, setFormData] = useState({
    display_name: "",
    username: "",
    bio: "",
    city: "",
    instagram_handle: "",
    category: "Venue",
    opening_hours: {} as Record<string, string>,
    tags: [] as string[],
  });

  useEffect(() => {
    if (!isOrganiser) {
      navigate("/profile/edit");
      return;
    }
    if (activeOrg) {
      setFormData({
        display_name: activeOrg.displayName || "",
        username: activeOrg.username || "",
        bio: activeOrg.bio || "",
        city: activeOrg.city || "",
        instagram_handle: activeOrg.instagramHandle || "",
        category: activeOrg.category || "Venue",
        opening_hours: (activeOrg as any).openingHours || {},
        tags: (activeOrg as any).tags || [],
      });
    }
  }, [activeOrg, isOrganiser, navigate]);

  const handleSave = async () => {
    if (!activeOrg) return;
    if (!formData.display_name.trim() || !formData.username.trim()) {
      toast({ title: "Required fields", description: "Display name and username are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await callEdgeFunction("organiser-profile-update", {
        body: {
          profile_id: activeOrg.id,
          ...formData,
          opening_hours: formData.category === "Venue" ? formData.opening_hours : null,
        },
      });
      await refetchOrganiserProfiles();
      toast({ title: "Profile updated", description: "Your organiser profile has been saved." });
      navigate("/profile");
    } catch (error: any) {
      const msg = error?.message || "Failed to update organiser profile.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formData.tags.includes(trimmed) && formData.tags.length < 20) {
      setFormData({ ...formData, tags: [...formData.tags, trimmed] });
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const updateOpeningHours = (day: string, value: string) => {
    setFormData({
      ...formData,
      opening_hours: { ...formData.opening_hours, [day]: value },
    });
  };

  if (!activeOrg) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Edit Organiser</h1>
          <Button onClick={handleSave} disabled={saving} className="rounded-full px-6">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="space-y-2">
          <Label>Display Name *</Label>
          <Input
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="Your organiser name"
          />
        </div>

        <div className="space-y-2">
          <Label>Username *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
              }
              placeholder="username"
              className="pl-8"
            />
          </div>
          <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and underscores</p>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell people about your brand..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>City</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                {formData.city || "Select a city"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search cities..." />
                <CommandList>
                  <CommandEmpty>No city found.</CommandEmpty>
                  <CommandGroup>
                    {CITIES.map((city) => (
                      <CommandItem key={city} value={city} onSelect={() => setFormData({ ...formData, city })}>
                        <Check className={cn("mr-2 h-4 w-4", formData.city === city ? "opacity-100" : "opacity-0")} />
                        {city}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Instagram</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              value={formData.instagram_handle}
              onChange={(e) =>
                setFormData({ ...formData, instagram_handle: e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30) })
              }
              placeholder="your.instagram"
              className="pl-8"
            />
          </div>
        </div>

        {/* Tags Section - Genre, Crowd, Features */}
        <div className="space-y-3">
          <Label>Tags (Genre, Crowd, Features)</Label>
          <p className="text-xs text-muted-foreground">Add tags to describe your vibe, crowd, and features. Max 20.</p>

          {/* Current tags */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add custom tag */}
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(newTag); } }}
              placeholder="Add a custom tag..."
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={() => addTag(newTag)} disabled={!newTag.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Suggestions */}
          {Object.entries(TAG_SUGGESTIONS).map(([category, suggestions]) => (
            <div key={category}>
              <p className="text-xs font-medium text-muted-foreground capitalize mb-1.5">{category}</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions
                  .filter((s) => !formData.tags.includes(s))
                  .map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => addTag(suggestion)}
                      className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      + {suggestion}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Opening Hours - Venue only */}
        {formData.category === "Venue" && (
          <div className="space-y-3">
            <Label>Opening Hours</Label>
            <p className="text-xs text-muted-foreground">Set your venue's opening hours for each day.</p>
            <div className="space-y-2">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-24 shrink-0">{day}</span>
                  <Input
                    value={formData.opening_hours[day] || ""}
                    onChange={(e) => updateOpeningHours(day, e.target.value)}
                    placeholder="e.g. 10:00 - 02:00 or Closed"
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EditOrganiserProfile;
