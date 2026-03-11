import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  date, setDate,
  time, setTime,
  location, setLocation,
  description, setDescription,
  cohosts, setCohosts,
  cohostInput, setCohostInput,
  errors = {},
}: EventDetailsFormProps) => {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const query = cohostInput.trim().replace(/^@/, "");
    if (query.length < 2) { setSearchResults([]); setShowDropdown(false); return; }

    searchTimeoutRef.current = setTimeout(async () => {
      const term = `%${query}%`;
      const cohostIds = new Set(cohosts.map(c => c.id));

      const [profilesRes, organisersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url")
          .or(`username.ilike.${term},display_name.ilike.${term}`).neq("user_id", user?.id ?? "").limit(10),
        supabase.from("organiser_profiles").select("id, display_name, username, avatar_url, owner_id")
          .or(`username.ilike.${term},display_name.ilike.${term}`).limit(10),
      ]);

      let friendIds = new Set<string>();
      if (user) {
        const { data: connections } = await supabase.from("connections")
          .select("requester_id, addressee_id").eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
        if (connections) connections.forEach((c) => {
          friendIds.add(c.requester_id === user.id ? c.addressee_id : c.requester_id);
        });
      }

      const results: SearchResult[] = [];
      for (const o of organisersRes.data || []) {
        if (cohostIds.has(o.id) || o.owner_id === user?.id) continue;
        results.push({ id: o.id, type: "organiser", display_name: o.display_name, username: o.username, avatar_url: o.avatar_url, isFriend: false });
      }
      for (const p of profilesRes.data || []) {
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
          <div className="flex flex-wrap gap-1.5 mt-3">
            {cohosts.map((c) => (
              <Badge key={c.id} variant="secondary" className="text-xs gap-1 flex items-center">
                {c.avatarUrl && <img src={c.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />}
                {c.displayName}
                {c.type === "organiser" && <span className="text-muted-foreground text-[10px]">·org</span>}
                <button type="button" onClick={() => removeCohost(c.id)} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailsForm;
