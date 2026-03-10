import { useEffect, useState } from "react";
import PayoutSetupSection from "@/components/PayoutSetupSection";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const displayInitial = (formData.display_name?.[0] || "O").toUpperCase();

  return (
    <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase">Edit Organiser</h1>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="rounded-full px-5 text-xs font-bold tracking-widest"
          >
            {saving ? "···" : "SAVE"}
          </Button>
        </div>
      </header>

      <main className="px-4 pb-12 max-w-lg mx-auto">
        {/* Avatar hero */}
        <div className="flex flex-col items-center pt-8 pb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/25 blur-2xl scale-150 pointer-events-none" />
            <Avatar className="relative h-28 w-28 border-2 border-primary/40 ring-4 ring-background shadow-xl">
              <AvatarImage src={activeOrg.avatarUrl || undefined} />
              <AvatarFallback className="text-3xl bg-card text-foreground font-bold">
                {displayInitial}
              </AvatarFallback>
            </Avatar>
          </div>
          <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground mt-3">
            {formData.display_name || "Organiser"}
          </p>
        </div>

        <div className="space-y-3">

          {/* Name + Username */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Display Name</p>
              <input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Your organiser name"
                className="w-full bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none"
              />
            </div>
            <div className="h-px bg-border/50 mx-4" />
            <div className="px-4 pt-3 pb-4">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Username</p>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-[15px]">@</span>
                <input
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
                  }
                  placeholder="username"
                  className="flex-1 bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="bg-card rounded-2xl border border-border/50 px-4 pt-4 pb-4">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Category</p>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger className="border-0 p-0 h-auto bg-transparent text-[15px] font-medium shadow-none focus:ring-0 focus:outline-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bio */}
          <div className="bg-card rounded-2xl border border-border/50 px-4 pt-4 pb-4">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Bio</p>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell people about your brand…"
              rows={3}
              className="w-full bg-transparent text-foreground text-[15px] placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Instagram + City */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Instagram</p>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-[15px]">@</span>
                <input
                  value={formData.instagram_handle}
                  onChange={(e) =>
                    setFormData({ ...formData, instagram_handle: e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30) })
                  }
                  placeholder="your.instagram"
                  className="flex-1 bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none"
                />
              </div>
            </div>
            <div className="h-px bg-border/50 mx-4" />
            <div className="px-4 pt-3 pb-4">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">City</p>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between w-full">
                    <span className={`text-[15px] font-medium ${formData.city ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {formData.city || "Select a city"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search cities…" />
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
          </div>

          {/* Opening Hours — Venue only */}
          {formData.category === "Venue" && (
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Opening Hours</p>
                <p className="text-xs text-muted-foreground mt-0.5">Leave blank for closed</p>
              </div>
              {DAYS.map((day, i) => (
                <div key={day}>
                  {i !== 0 && <div className="h-px bg-border/50 mx-4" />}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[13px] font-medium text-muted-foreground w-24 shrink-0">{day}</span>
                    <input
                      value={formData.opening_hours[day] || ""}
                      onChange={(e) => updateOpeningHours(day, e.target.value)}
                      placeholder="10:00 – 02:00"
                      className="flex-1 bg-transparent text-foreground text-[14px] placeholder:text-muted-foreground/40 outline-none text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payouts */}
          <PayoutSetupSection
            organiserProfileId={activeOrg.id}
            isOwner={activeOrg.ownerId === (user?.id || "")}
          />
        </div>

        {/* Bottom save */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 h-12 rounded-2xl font-bold tracking-widest text-sm"
        >
          {saving ? "SAVING…" : "SAVE CHANGES"}
        </Button>
      </main>
    </div>
  );
};

export default EditOrganiserProfile;
