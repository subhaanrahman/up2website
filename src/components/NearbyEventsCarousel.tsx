import { useEffect, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import useEmblaCarousel from "embla-carousel-react";

interface NearbyEvent {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  venue_name?: string | null;
  address?: string | null;
  cover_image: string | null;
  ticket_price_cents: number;
}

interface NearbyEventsCarouselProps {
  events: NearbyEvent[];
}

const NearbyEventsCarousel = ({ events }: NearbyEventsCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [activeIndex, setActiveIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (!emblaApi || events.length <= 1) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi, events.length]);

  return (
    <div className="border-b border-border">
      <div className="px-4 py-3">
        <h2 className="text-base font-black text-foreground uppercase font-display tracking-[0.05em]" style={{ fontStretch: "expanded" }}>
          Events Near You
        </h2>
      </div>
      <div className="px-4 pb-4">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {events.map((event) => (
              <div key={event.id} className="min-w-0 shrink-0 grow-0 basis-full">
                <Link
                  to={`/events/${event.id}`}
                  className="flex rounded-tile overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="h-28 aspect-[3/4] flex-shrink-0 overflow-hidden bg-muted">
                    <img
                      src={event.cover_image || getEventFlyer(event.id)}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 pl-4 pr-3 py-3 flex flex-col justify-center min-w-0">
                    <h3 className="font-bold text-foreground text-sm truncate capitalize">{event.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span>{format(new Date(event.event_date), "EEE MMM d '•' haaa")}</span>
                    </div>
                    {(event.venue_name ?? event.location) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="truncate">{event.venue_name ?? event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <DollarSign className="h-3 w-3 text-primary" />
                      <span>{event.ticket_price_cents === 0 ? "Free" : `R${(event.ticket_price_cents / 100).toFixed(2)}`}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        {/* Dot indicators */}
        {events.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {events.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyEventsCarousel;
