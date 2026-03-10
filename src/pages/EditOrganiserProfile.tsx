import { useEffect, useState } from "react";
import PayoutSetupSection from "@/components/PayoutSetupSection";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["Venue", "Event"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EditOrganiserProfile = () => {
  const navigate = useNavigate();
  const { activeProfile, isOrganiser, organiserProfiles, refetchOrganiserProfiles } = useActiveProfile();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

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

        {/* Payouts Section */}
        <PayoutSetupSection
          organiserProfileId={activeOrg.id}
          isOwner={activeOrg.ownerId === (user?.id || '')}
        />
      </main>
    </div>
  );
};

export default EditOrganiserProfile;
