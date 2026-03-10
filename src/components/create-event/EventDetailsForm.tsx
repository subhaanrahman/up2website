import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Clock, Image, X, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const GENRE_OPTIONS = ["Afrobeats", "Amapiano", "Hip-Hop", "House", "R&B", "Techno", "Pop", "Jazz", "Classical", "Other"];
const STYLE_OPTIONS = ["Day Party", "Night Out", "Brunch", "Dinner", "Festival", "Intimate", "Formal", "Casual"];
const VIBE_OPTIONS = ["Chill", "Hype", "Romantic", "Classy", "Underground", "Bougie", "Afro-futuristic", "Retro"];

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
  category: string;
  setCategory: (v: string) => void;
  selectedGenres: string[];
  setSelectedGenres: (v: string[]) => void;
  selectedStyles: string[];
  setSelectedStyles: (v: string[]) => void;
  selectedVibes: string[];
  setSelectedVibes: (v: string[]) => void;
  cohosts: CohostEntry[];
  setCohosts: (v: CohostEntry[]) => void;
  cohostInput: string;
  setCohostInput: (v: string) => void;
}

const TagSelector = ({ label, options, selected, setSelected }: {
  label: string;
  options: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
}) => {
  const toggle = (opt: string) => {
    setSelected(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-foreground text-sm">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Badge
            key={opt}
            variant={selected.includes(opt) ? "default" : "outline"}
            className="cursor-pointer text-xs px-3 py-1.5 select-none"
            onClick={() => toggle(opt)}
          >
            {opt}
          </Badge>
        ))}
      </div>
    </div>
  );
};

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
  category, setCategory,
  selectedGenres, setSelectedGenres,
  selectedStyles, setSelectedStyles,
  selectedVibes, setSelectedVibes,
  cohosts, setCohosts,
  cohostInput, setCohostInput,
}: EventDetailsFormProps) => {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search for co-host usernames — searches both profiles and organiser profiles
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const query = cohostInput.trim().replace(/^@/, "");
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const term = `%${query}%`;
      const cohostIds = new Set(cohosts.map(c => c.id));

      const [profilesRes, organisersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .or(`username.ilike.${term},display_name.ilike.${term}`)
          .neq("user_id", user?.id ?? "")
          .limit(10),
        supabase
          .from("organiser_profiles")
          .select("id, display_name, username, avatar_url, owner_id")
          .or(`username.ilike.${term},display_name.ilike.${term}`)
          .limit(10),
      ]);

      // Check which are friends
      let friendIds = new Set<string>();
      if (user) {
        const { data: connections } = await supabase
          .from("connections")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        if (connections) {
          connections.forEach((c) => {
            friendIds.add(c.requester_id === user.id ? c.addressee_id : c.requester_id);
          });
        }
      }

      const results: SearchResult[] = [];

      // Organiser profiles first
      for (const o of organisersRes.data || []) {
        if (cohostIds.has(o.id)) continue;
        // Don't show the user's own organiser profiles
        if (o.owner_id === user?.id) continue;
        results.push({
          id: o.id,
          type: "organiser",
          display_name: o.display_name,
          username: o.username,
          avatar_url: o.avatar_url,
          isFriend: false,
        });
      }

      // Personal profiles
      for (const p of profilesRes.data || []) {
        if (cohostIds.has(p.user_id)) continue;
        results.push({
          id: p.user_id,
          type: "personal",
          display_name: p.display_name,
          username: p.username,
          avatar_url: p.avatar_url,
          isFriend: friendIds.has(p.user_id),
        });
      }

      // Sort friends first
      results.sort((a, b) => (a.isFriend === b.isFriend ? 0 : a.isFriend ? -1 : 1));

      setSearchResults(results);
      setShowDropdown(results.length > 0);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [cohostInput, user?.id, cohosts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectCohost = (result: SearchResult) => {
    if (!cohosts.find(c => c.id === result.id)) {
      setCohosts([...cohosts, {
        id: result.id,
        type: result.type,
        displayName: result.display_name || result.username || "Unknown",
        username: result.username,
        avatarUrl: result.avatar_url,
      }]);
    }
    setCohostInput("");
    setShowDropdown(false);
  };

  const removeCohost = (id: string) => {
    setCohosts(cohosts.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-foreground">Event Title *</Label>
        <Input id="title" placeholder="Give your event a name" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 bg-card border-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-primary" /> Date *
          </Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 bg-card border-border" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time" className="flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4 text-primary" /> Time
          </Label>
          <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 bg-card border-border" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location" className="flex items-center gap-2 text-foreground">
          <MapPin className="h-4 w-4 text-primary" /> Location *
        </Label>
        <Input id="location" placeholder="Where's the event?" value={location} onChange={(e) => setLocation(e.target.value)} className="h-12 bg-card border-border" />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 bg-card border-border">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="party">🎉 Party</SelectItem>
            <SelectItem value="social">🥂 Social</SelectItem>
            <SelectItem value="dinner">🍽️ Dinner</SelectItem>
            <SelectItem value="brunch">🥞 Brunch</SelectItem>
            <SelectItem value="concert">🎵 Concert</SelectItem>
            <SelectItem value="festival">🎪 Festival</SelectItem>
            <SelectItem value="sports">⚽ Sports</SelectItem>
            <SelectItem value="networking">🤝 Networking</SelectItem>
            <SelectItem value="other">📌 Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Collaborators / Cohosts */}
      <div className="space-y-2" ref={dropdownRef}>
        <Label className="flex items-center gap-2 text-foreground">
          <Users className="h-4 w-4 text-primary" /> Collaborators / Co-hosts
        </Label>
        <div className="relative">
          <div className="flex gap-2">
            <Input
              placeholder="Search @username or name"
              value={cohostInput}
              onChange={(e) => setCohostInput(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              className="h-12 bg-card border-border flex-1"
            />
          </div>
          {showDropdown && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left"
                  onClick={() => selectCohost(result)}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {result.avatar_url ? (
                      <img src={result.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-foreground">
                        {(result.display_name || result.username || "?")[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{result.display_name || result.username}</p>
                    {result.username && <p className="text-xs text-muted-foreground truncate">@{result.username}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {result.type === "organiser" && (
                      <Badge variant="secondary" className="text-[10px]">Organiser</Badge>
                    )}
                    {result.isFriend && (
                      <Badge variant="secondary" className="text-[10px]">Friend</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {cohosts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {cohosts.map((c) => (
              <Badge key={c.id} variant="secondary" className="text-xs gap-1 flex items-center">
                {c.avatarUrl && (
                  <img src={c.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                )}
                {c.displayName}
                {c.type === "organiser" && <span className="text-muted-foreground text-[10px]">•org</span>}
                <button type="button" onClick={() => removeCohost(c.id)} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <TagSelector label="Genre / Music" options={GENRE_OPTIONS} selected={selectedGenres} setSelected={setSelectedGenres} />
      <TagSelector label="Event Style" options={STYLE_OPTIONS} selected={selectedStyles} setSelected={setSelectedStyles} />
      <TagSelector label="Vibe" options={VIBE_OPTIONS} selected={selectedVibes} setSelected={setSelectedVibes} />

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-foreground">Description</Label>
        <Textarea id="description" placeholder="Tell your guests what to expect..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-card border-border" />
      </div>
    </div>
  );
};

export default EventDetailsForm;