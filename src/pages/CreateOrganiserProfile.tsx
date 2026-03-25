import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { toast } from "@/hooks/use-toast";
import {
  FormFieldCard,
  FormFieldDivider,
  FormFieldLabel,
  FormFlowHeader,
  FormFlowMain,
  FormFlowScreen,
  formFlowInputClass,
  formFlowPrimaryButtonClass,
} from "@/components/form-flow/FormFlowLayout";

const CATEGORIES = ["Venue", "Event"];

const CreateOrganiserProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetchOrganiserProfiles, switchProfile } = useActiveProfile();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: "",
    username: "",
    bio: "",
    city: "",
    instagram_handle: "",
    category: "Venue",
  });

  const handleSave = async () => {
    if (!user) return;
    if (!formData.display_name.trim() || !formData.username.trim()) {
      toast({ title: "Required fields", description: "Display name and username are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const result = await callEdgeFunction<{ success: boolean; profile: { id: string; display_name: string } }>(
        "organiser-profile-create",
        { body: formData }
      );
      await refetchOrganiserProfiles();
      switchProfile(result.profile.id, "organiser");
      toast({ title: "Organiser page created!", description: `${result.profile.display_name} is now active.` });
      navigate("/profile");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to create organiser page.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormFlowScreen>
      <FormFlowHeader
        title="Organiser page"
        onBack={() => navigate(-1)}
        rightSlot={
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="rounded-full px-5 text-xs font-bold tracking-widest"
          >
            {saving ? "···" : "CREATE"}
          </Button>
        }
      />

      <FormFlowMain>
        <div className="space-y-3">
          <FormFieldCard>
            <div className="px-4 pt-4 pb-3">
              <FormFieldLabel>Display name</FormFieldLabel>
              <input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Your organiser name"
                className={formFlowInputClass}
              />
            </div>
            <FormFieldDivider />
            <div className="px-4 pt-3 pb-4">
              <FormFieldLabel>Username</FormFieldLabel>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-[15px]">@</span>
                <input
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
                  }
                  placeholder="username"
                  className={cn(formFlowInputClass, "flex-1")}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">Lowercase letters, numbers, and underscores only.</p>
            </div>
          </FormFieldCard>

          <FormFieldCard className="px-4 pt-4 pb-4">
            <FormFieldLabel>Category</FormFieldLabel>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger className="border-0 p-0 h-auto bg-transparent text-[15px] font-medium shadow-none focus:ring-0 focus:outline-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormFieldCard>

          <FormFieldCard className="px-4 pt-4 pb-4">
            <FormFieldLabel>Bio</FormFieldLabel>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell people about your brand…"
              rows={3}
              className={cn(formFlowInputClass, "resize-none leading-relaxed")}
            />
          </FormFieldCard>

          <FormFieldCard>
            <div className="px-4 pt-4 pb-3">
              <FormFieldLabel>Instagram</FormFieldLabel>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-[15px]">@</span>
                <input
                  value={formData.instagram_handle}
                  onChange={(e) =>
                    setFormData({ ...formData, instagram_handle: e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30) })
                  }
                  placeholder="your.instagram"
                  className={cn(formFlowInputClass, "flex-1")}
                />
              </div>
            </div>
            <FormFieldDivider />
            <div className="px-4 pt-3 pb-4">
              <FormFieldLabel>City</FormFieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center justify-between w-full text-left">
                    <span
                      className={cn(
                        "text-[15px] font-medium",
                        formData.city ? "text-foreground" : "text-muted-foreground/40",
                      )}
                    >
                      {formData.city || "Select a city"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
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
          </FormFieldCard>
        </div>

        <Button onClick={handleSave} disabled={saving} className={cn(formFlowPrimaryButtonClass, "mt-6")}>
          {saving ? "CREATING…" : "CREATE PAGE"}
        </Button>
      </FormFlowMain>
    </FormFlowScreen>
  );
};

export default CreateOrganiserProfile;
