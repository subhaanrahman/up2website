import { Link } from "react-router-dom";
import { Calendar, MapPin, Users, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PublicImage } from "@/components/ui/public-image";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsRepository } from "@/features/events/repositories/eventsRepository";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface FriendGoingSummary {
  avatarUrl: string | null;
  displayName: string | null;
}

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  attendees: number;
  category: string;
  friendsGoing?: FriendGoingSummary[];
}

const EventCard = ({ id, title, date, time, location, image, attendees, category, friendsGoing }: EventCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const isUuid = id && id.length > 5;

  const { data: savedStatus } = useQuery({
    queryKey: ["saved-event", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      return eventsRepository.isEventSaved(id, user.id);
    },
    enabled: !!user && !!isUuid,
  });

  const isSaved = !!savedStatus;

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !isUuid || saving) return;
    setSaving(true);
    try {
      if (isSaved) {
        await eventsRepository.unsaveEvent(user.id, id);
        toast({ title: "Removed from saved" });
      } else {
        await eventsRepository.saveEvent(user.id, id);
        toast({ title: "Saved!" });
      }
      queryClient.invalidateQueries({ queryKey: ["saved-event", id, user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-tickets"] });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Link to={`/events/${id}`} className="group block">
      <div className="bg-card rounded-tile-sm overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden">
          <PublicImage
            src={image}
            preset="EVENT_CARD"
            assetType="event-flyer"
            surface="event-card"
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-card-foreground">
              {category}
            </Badge>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-base text-card-foreground mb-2 line-clamp-1 tracking-tight group-hover:text-primary transition-colors capitalize">
            {title}
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{date} • {time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="line-clamp-1">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>{attendees} attending</span>
            </div>
          </div>

          {/* P-19: Friends going */}
          {friendsGoing && friendsGoing.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <div className="flex -space-x-2">
                {friendsGoing.slice(0, 3).map((f, i) => (
                  <Avatar key={i} className="h-6 w-6 border-2 border-card">
                    <AvatarImage src={f.avatarUrl || undefined} surface="event-card-friends-going" />
                    <AvatarFallback className="text-[10px]">{(f.displayName || "?")[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {friendsGoing.length === 1
                  ? `${friendsGoing[0].displayName || 'A friend'} is going`
                  : `${friendsGoing.length} friends going`}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
