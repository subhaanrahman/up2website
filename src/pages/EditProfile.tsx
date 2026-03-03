import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
      if (error?.code === "23505") {
        toast({ title: "Username taken", description: "Please choose another username.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Edit Profile</h1>
          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
            className="rounded-full px-6"
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-2xl bg-card text-foreground font-bold">
                {displayInitial}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatarMutation.isPending}
              className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {uploadAvatarMutation.isPending ? "Uploading..." : "Tap to change photo"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_name">Display Name</Label>
          <Input
            id="display_name"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="Your display name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="username"
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
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell people about yourself..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="page_classification">Classification (optional)</Label>
          <Select
            value={formData.page_classification || "none"}
            onValueChange={(value) => setFormData({ ...formData, page_classification: value === "none" ? "" : value })}
          >
            <SelectTrigger>
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

        <div className="space-y-2">
          <Label htmlFor="instagram_handle">Instagram</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="instagram_handle"
              value={formData.instagram_handle}
              onChange={(e) =>
                setFormData({ ...formData, instagram_handle: e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30) })
              }
              placeholder="your.instagram"
              className="pl-8"
            />
          </div>
          <p className="text-xs text-muted-foreground">Your Instagram username (without the @)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between font-normal"
              >
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
                      <CommandItem
                        key={city}
                        value={city}
                        onSelect={() => setFormData({ ...formData, city })}
                      >
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
      </main>
    </div>
  );
};

export default EditProfile;
