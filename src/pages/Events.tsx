import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import CategoryPill from "@/components/CategoryPill";
import { Badge } from "@/components/ui/badge";
import { categories } from "@/data/events";
import { Search, Calendar, MapPin, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  cover_image: string | null;
  category: string | null;
}

const Events = () => {
  const [activeCategory, setActiveCategory] = useState("All Events");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title, event_date, location, cover_image, category")
      .eq("is_public", true)
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });

    setEvents(data || []);
    setLoading(false);
  };

  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      activeCategory === "All Events" || event.category === activeCategory.toLowerCase();
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border md:hidden">
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-foreground">Discover</h1>
            <Button variant="ghost" size="icon">
              <Filter className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>
        
        {/* Categories */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {categories.map((category) => (
              <CategoryPill
                key={category.label}
                label={category.label}
                icon={category.icon}
                active={activeCategory === category.label}
                onClick={() => setActiveCategory(category.label)}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <main className="pt-4 md:pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Desktop Title */}
          <div className="hidden md:block mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Browse Events</h1>
            <p className="text-muted-foreground">Discover amazing events happening near you</p>
          </div>

          {/* Desktop Search & Categories */}
          <div className="hidden md:block space-y-4 mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <CategoryPill
                  key={category.label}
                  label={category.label}
                  icon={category.icon}
                  active={activeCategory === category.label}
                  onClick={() => setActiveCategory(category.label)}
                />
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">Loading...</div>
          ) : filteredEvents.length > 0 ? (
            <>
              {/* Mobile List View */}
              <div className="md:hidden space-y-3">
                {filteredEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex gap-4 bg-card rounded-xl p-3 border border-border"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      {event.cover_image ? (
                        <img
                          src={event.cover_image}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.event_date), "EEE, MMM d • h:mm a")}
                      </p>
                      {event.location && (
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                      {event.category && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {event.category}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Grid View */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="group bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all"
                  >
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {event.cover_image ? (
                        <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      {event.category && <Badge className="absolute top-3 left-3">{event.category}</Badge>}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-card-foreground mb-2 group-hover:text-primary transition-colors">{event.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(event.event_date), "MMM d, yyyy • h:mm a")}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No events found</p>
              <p className="text-sm text-muted-foreground">Try a different search or category</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Events;
