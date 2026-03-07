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
  cohosts: string[];
  setCohosts: (v: string[]) => void;
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
            className={`cursor-pointer text-xs transition-colors ${
              selected.includes(opt)
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
            onClick={() => toggle(opt)}
          >
            {opt}
          </Badge>
        ))}
      </div>
    </div>
  );
};

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
  const addCohost = () => {
    const trimmed = cohostInput.trim();
    if (trimmed && !cohosts.includes(trimmed)) {
      setCohosts([...cohosts, trimmed]);
      setCohostInput("");
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-foreground">Event Title *</Label>
        <Input id="title" placeholder="e.g., Summer Garden Party" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 bg-card border-border text-base" />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-primary" /> Date *
          </Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 bg-card border-border" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4 text-primary" /> Time
          </Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 bg-card border-border" />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-foreground">
          <MapPin className="h-4 w-4 text-primary" /> Location *
        </Label>
        <Input placeholder="e.g., 123 Main St, Brooklyn, NY" value={location} onChange={(e) => setLocation(e.target.value)} className="h-12 bg-card border-border" />
      </div>

      {/* Cover Image / Flyer upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-foreground">
          <Image className="h-4 w-4 text-primary" /> Upload Flyer
        </Label>
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-card">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Image className="h-8 w-8" />
            <p className="text-sm">Tap to upload</p>
            <p className="text-xs">PNG, JPG up to 10MB</p>
          </div>
        </div>
      </div>

      {/* Tags: Genre, Style, Vibes */}
      <div className="space-y-4">
        <TagSelector label="Genre" options={GENRE_OPTIONS} selected={selectedGenres} setSelected={setSelectedGenres} />
        <TagSelector label="Style" options={STYLE_OPTIONS} selected={selectedStyles} setSelected={setSelectedStyles} />
        <TagSelector label="Vibes" options={VIBE_OPTIONS} selected={selectedVibes} setSelected={setSelectedVibes} />
      </div>

      {/* Category (existing) */}
      <div className="space-y-2">
        <Label className="text-foreground">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 bg-card border-border"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="birthday">🎂 Birthday</SelectItem>
            <SelectItem value="dinner">🍽️ Dinner</SelectItem>
            <SelectItem value="wedding">💒 Wedding</SelectItem>
            <SelectItem value="party">🎉 Party</SelectItem>
            <SelectItem value="social">🍸 Social</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Collaborators / Cohosts */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-foreground">
          <Users className="h-4 w-4 text-primary" /> Collaborators / Co-hosts
        </Label>
        <div className="flex gap-2">
          <Input placeholder="@username" value={cohostInput} onChange={(e) => setCohostInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCohost())} className="h-12 bg-card border-border flex-1" />
          <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={addCohost}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {cohosts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {cohosts.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs gap-1">
                @{c}
                <button type="button" onClick={() => setCohosts(cohosts.filter((h) => h !== c))} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-foreground">Description</Label>
        <Textarea id="description" placeholder="Tell your guests what to expect..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-card border-border" />
      </div>
    </div>
  );
};

export default EventDetailsForm;
