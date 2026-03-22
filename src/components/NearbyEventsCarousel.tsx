import { useEffect, useCallback, useState } from "react";
import { DollarSign, Mail } from "lucide-react";
import { EventTile, type EventTileEvent } from "@/components/EventTile";
import { Badge } from "@/components/ui/badge";
import { getEventPricePillLabel, eventHasPaidTickets } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchEventDetail } from "@/lib/prefetch";

interface NearbyEvent extends EventTileEvent {
  address?: string | null;
  ticket_price_cents?: number;
}

interface NearbyEventsCarouselProps {
  events: NearbyEvent[];
}

const NearbyEventsCarousel = ({ events }: NearbyEventsCarouselProps) => {
  const queryClient = useQueryClient();
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
                <EventTile
                  event={event}
                  onNavigateIntent={() => prefetchEventDetail(queryClient, event.id)}
                  dateRightBadge={(
                    <Badge
                      variant="primary"
                      className="text-[11px] py-1 px-2 gap-1"
                    >
                      {eventHasPaidTickets(event.ticket_price_cents) ? (
                        <>
                          <DollarSign className="h-3 w-3 shrink-0" />
                          {getEventPricePillLabel(event.ticket_price_cents)}
                        </>
                      ) : (
                        <>
                          <Mail className="h-3 w-3 shrink-0" />
                          {getEventPricePillLabel(event.ticket_price_cents)}
                        </>
                      )}
                    </Badge>
                  )}
                  className="w-full"
                />
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
