import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Users, Image as ImageIcon } from "lucide-react";
import { supabase } from '@/infrastructure/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { validateImageFileOrMessage } from "@/utils/fileValidation";
import { connectionsRepository } from "@/features/social/repositories/connectionsRepository";
import { profilesRepository } from "@/features/social/repositories/profilesRepository";
import { DatePicker, TimePicker } from "./DateTimePicker";

export interface CohostEntry {
  id: string;
  type: "personal" | "organiser";
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
}

interface EventDetailsFormProps {
  title: string;
  setTitle: (v: string) => void;
  coverImage: string | null;
  setCoverImage: (v: string | null) => void;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  cohosts: CohostEntry[];
  setCohosts: (v: CohostEntry[]) => void;
  cohostInput: string;
  setCohostInput: (v: string) => void;
  errors?: { title?: string; date?: string; location?: string };
}

interface SearchResult {
  id: string;
  type: "personal" | "organiser";
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  isFriend: boolean;
}

const EventDetailsForm = ({
  title, setTitle,
  coverImage, setCoverImage,
  date, setDate,
  time, setTime,
  location, setLocation,
  description, setDescription,
  cohosts, setCohosts,
  cohostInput, setCohostInput,
  errors = {},
}: EventDetailsFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);

  const handleFlyerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const err = validateImageFileOrMessage(file);
    if (err) {
      toast({ title: "Invalid file", description: err, variant: "destructive" });
      return;
    }
    setUploadingFlyer(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/events/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("post-images")
        .upload(path, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setCoverImage(data.publicUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingFlyer(false);
      if (e.target) e.target.value = "";
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const query = cohostInput.trim().replace(/^@/, "");
    if (query.length < 2) { setSearchResults([]); setShowDropdown(false); return; }

    searchTimeoutRef.current = setTimeout(async () => {
      const term = query;
      const cohostIds = new Set(cohosts.map(c => c.id));

      const [profilesData, organisersData] = await Promise.all([
        profilesRepository.searchProfiles(term, { excludeUserId: user?.id, limit: 10 }),
        profilesRepository.searchOrganisers(term, { limit: 10, includeOwner: true }),
      ]);

      const friendIds = user ? await connectionsRepository.getFriendIds(user.id) : new Set<string>();

      const results: SearchResult[] = [];
      for (const o of organisersData || []) {
        const org = o as unknown as { id: string; display_name: string | null; username: string | null; avatar_url: string | null; owner_id?: string };
        if (cohostIds.has(org.id) || org.owner_id === user?.id) continue;
        results.push({ id: org.id, type: "organiser", display_name: org.display_name, username: org.username, avatar_url: org.avatar_url, isFriend: false });
      }
      for (const p of profilesData || []) {
        if (cohostIds.has(p.user_id)) continue;
        results.push({ id: p.user_id, type: "personal", display_name: p.display_name, username: p.username, avatar_url: p.avatar_url, isFriend: friendIds.has(p.user_id) });
      }
      results.sort((a, b) => (a.isFriend === b.isFriend ? 0 : a.isFriend ? -1 : 1));
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    }, 300);

    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [cohostInput, user?.id, cohosts]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectCohost = (result: SearchResult) => {
    if (!cohosts.find(c => c.id === result.id)) {
      setCohosts([...cohosts, { id: result.id, type: result.type, displayName: result.display_name || result.username || "Unknown", username: result.username, avatarUrl: result.avatar_url }]);
    }
    setCohostInput("");
    setShowDropdown(false);
  };

  const removeCohost = (id: string) => setCohosts(cohosts.filter(c => c.id !== id));

  return (
    <div className="space-y-3">

      {/* Title */}
      <div className={`bg-card rounded-2xl border px-4 pt-4 pb-4 ${errors.title ? "border-destructive" : "border-border/50"}`}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Event Title *</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your event a name"
          className="w-full bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none"
        />
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
      </div>

      {/* Event flyer upload */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 rounded-2xl border border-border/60 px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3" /> Event Flyer
          </p>
          <span className="text-[10px] text-muted-foreground/80">Shows on cards & detail</span>
        </div>
        <div className="space-y-3">
          <div className="w-full aspect-[4/5] rounded-2xl bg-muted/60 border border-border/60 overflow-hidden flex items-center justify-center">
            {coverImage ? (
              <img src={coverImage} alt="Event flyer" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-6 text-center">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Add a bold flyer to make your event pop.
                </span>
                <span className="text-[10px] text-muted-foreground/80">
                  Portrait image works best (4:5)
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="flex-1 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFlyer}
            >
              {uploadingFlyer ? "Uploading…" : "Upload flyer"}
            </Button>
            {coverImage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-3 text-[11px]"
                onClick={() => setCoverImage(null)}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFlyerSelect}
        />
      </div>

      {/* Date + Time */}
      <div className={`bg-card rounded-2xl border overflow-hidden ${errors.date ? "border-destructive" : "border-border/50"}`}>
        <DatePicker date={date} setDate={setDate} label="Date *" disablePast />
        {errors.date && <p className="text-xs text-destructive px-4 pb-2">{errors.date}</p>}
        <div className="h-px bg-border/50 mx-4" />
        <TimePicker time={time} setTime={setTime} />
      </div>

      {/* Location */}
      <div className={`bg-card rounded-2xl border px-4 pt-4 pb-4 ${errors.location ? "border-destructive" : "border-border/50"}`}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Location *</p>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where's the event?"
          className="w-full bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none"
        />
        {errors.location && <p className="text-xs text-destructive mt-1">{errors.location}</p>}
      </div>

      {/* Description */}
      <div className="bg-card rounded-2xl border border-border/50 px-4 pt-4 pb-4">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Description</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell your guests what to expect…"
          rows={3}
          className="w-full bg-transparent text-foreground text-[15px] placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Co-hosts */}
      <div className="bg-card rounded-2xl border border-border/50 px-4 pt-4 pb-4" ref={dropdownRef}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <Users className="h-3 w-3" /> Collaborators / Co-hosts
        </p>
        <div className="relative">
          <input
            value={cohostInput}
            onChange={(e) => setCohostInput(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            placeholder="Search @username or name"
            className="w-full bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 outline-none"
          />
          {showDropdown && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl max-h-48 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left first:rounded-t-2xl last:rounded-b-2xl"
                  onClick={() => selectCohost(result)}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {result.avatar_url
                      ? <img src={result.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-foreground">{(result.display_name || result.username || "?")[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{result.display_name || result.username}</p>
                    {result.username && <p className="text-xs text-muted-foreground truncate">@{result.username}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {result.type === "organiser" && <Badge variant="secondary" className="text-[10px]">Organiser</Badge>}
                    {result.isFriend && <Badge variant="secondary" className="text-[10px]">Friend</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {cohosts.length > 0 && (
          <div className="mt-3 space-y-2">
            {cohosts.map((c) => (
              <div
                key={c.id}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-foreground">
                        {c.displayName[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {c.displayName}
                    </span>
                    <div className="flex items-center gap-1">
                      {c.type === "organiser" && (
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          Organiser
                        </span>
                      )}
                      {c.type === "personal" && (
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          Personal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-[11px] font-semibold rounded-full"
                  onClick={() => removeCohost(c.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailsForm;
