import { Link } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  attendees: number;
  category: string;
}

const EventCard = ({ id, title, date, time, location, image, attendees, category }: EventCardProps) => {
  return (
    <Link to={`/events/${id}`} className="group block">
      <div className="bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={image}
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
          <h3 className="font-bold text-base text-card-foreground mb-2 line-clamp-1 tracking-tight group-hover:text-primary transition-colors capitalize !normal-case" style={{ textTransform: 'capitalize' }}>
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
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
