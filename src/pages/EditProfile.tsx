import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Camera, Check, ChevronsUpDown } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/hooks/useProfileQuery";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/infrastructure/supabase';
import { validateImageFileOrMessage } from "@/utils/fileValidation";

const PAGE_CLASSIFICATIONS = ["DJ", "Promoter", "Artist"];

const EditProfile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();

  const [formData, setFormData] = useState({
    display_name: "",
    username: "",
    bio: "",
    page_classification: "",
    city: "",
    instagram_handle: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.displayName || "",
        username: profile.username || "",
        bio: profile.bio || "",
        page_classification: profile.pageClassification || "",
        city: profile.city || "",
        instagram_handle: profile.instagramHandle || "",
      });
      setAvatarUrl(profile.avatarUrl || "");
    }
  }, [profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const err = validateImageFileOrMessage(file);
    if (err) {
      toast({ title: "Invalid file", description: err, variant: "destructive" });
      return;
    }

    try {
      const url = await uploadAvatarMutation.mutateAsync(file);
      setAvatarUrl(url);
      toast({ title: "Avatar updated", description: "Your profile picture has been updated." });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        displayName: formData.display_name,
        username: formData.username,
        bio: formData.bio,
        pageClassification: formData.page_classification || null,
        city: formData.city,
        instagramHandle: formData.instagram_handle || null,
      });

      toast({ title: "Profile updated", description: "Your profile has been saved successfully." });
      navigate("/profile");
    } catch (error: any) {
      console.error('[EditProfile] Save failed:', error);
      if (error?.code === "23505") {
        toast({ title: "Username taken", description: "Please choose another username.", variant: "destructive" });
      } else {
        const msg = error?.message || error?.toString() || "Failed to update profile.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    }
  };

  if (loading || profileLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const displayInitial = formData.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase">Edit Profile</h1>
          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
            size="sm"
            className="rounded-full px-5 text-xs font-bold tracking-widest"
          >
            {updateProfileMutation.isPending ? "···" : "SAVE"}
          </Button>
        </div>
      </header>

      <main className="px-4 pb-12 max-w-lg mx-auto">
        {/* Avatar hero */}
        <div className="flex flex-col items-center pt-8 pb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/25 blur-2xl scale-150 pointer-events-none" />
            <div className="relative">
              <Avatar className="h-28 w-28 border-2 border-primary/40 ring-4 ring-background shadow-xl">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-3xl bg-card text-foreground font-bold">
                  {displayInitial}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatarMutation.isPending}
                className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-2 shadow-lg border-2 border-background disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground mt-3">
            {uploadAvatarMutation.isPending ? "Uploading…" : "Tap to change photo"}
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>

        {/* Form — grouped cards */}
        <div className="space-y-3">

          {/* Name + Username */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Display Name</p>
              <input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Your name"
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

          {/* Bio */}
          <div className="bg-card rounded-2xl border border-border/50 px-4 pt-4 pb-4">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Bio</p>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell people about yourself…"
              rows={3}
              className="w-full bg-transparent text-foreground text-[15px] placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Classification */}
          <div className="bg-card rounded-2xl border border-border/50 px-4 pt-4 pb-4">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Classification</p>
            <Select
              value={formData.page_classification || "none"}
              onValueChange={(value) => setFormData({ ...formData, page_classification: value === "none" ? "" : value })}
            >
              <SelectTrigger className="border-0 p-0 h-auto bg-transparent text-[15px] font-medium shadow-none focus:ring-0 focus:outline-none">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {PAGE_CLASSIFICATIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        {/* Bottom save */}
        <Button
          onClick={handleSave}
          disabled={updateProfileMutation.isPending}
          className="w-full mt-6 h-12 rounded-2xl font-bold tracking-widest text-sm"
        >
          {updateProfileMutation.isPending ? "SAVING…" : "SAVE CHANGES"}
        </Button>
      </main>
    </div>
  );
};

export default EditProfile;
