import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Calendar, Users, Palette, Plus, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";
import { events } from "@/data/events";
import { useAuth } from "@/contexts/AuthContext";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const featuredEvents = events.slice(0, 3);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      {/* Mobile Home Screen */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">Eventful</span>
            </div>
            <Link to="/events">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </header>

        <main className="px-4 py-6 space-y-6">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {user ? "Welcome back 👋" : "Discover Events"}
            </h1>
            <p className="text-muted-foreground">
              Find and join amazing events near you
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/create" className="block">
              <div className="bg-primary rounded-xl p-4 flex flex-col items-center justify-center gap-2 h-24">
                <Plus className="h-6 w-6 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">Create Event</span>
              </div>
            </Link>
            <Link to="/events" className="block">
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 h-24">
                <Search className="h-6 w-6 text-foreground" />
                <span className="text-sm font-medium text-foreground">Browse Events</span>
              </div>
            </Link>
          </div>

          {/* Featured Events */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
              <Link to="/events">
                <Button variant="ghost" size="sm" className="gap-1 text-primary">
                  See All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              {featuredEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex gap-4 bg-card rounded-xl p-3 border border-border"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.date} • {event.time}</p>
                    <p className="text-sm text-muted-foreground truncate">{event.location}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="h-3 w-3 text-primary" />
                      <span className="text-xs text-primary">{event.attendees} going</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Why Eventful?</h2>
            <div className="grid gap-3">
              {[
                { icon: Palette, title: "Beautiful Designs", desc: "Stunning invites that pop" },
                { icon: Calendar, title: "Easy RSVPs", desc: "One-tap responses" },
                { icon: Users, title: "Guest Management", desc: "Keep everyone updated" },
              ].map((feature) => (
                <div key={feature.title} className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background" />
          
          <div className="relative z-10 container mx-auto px-4 text-center pt-16">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-card-foreground">Plan events in seconds</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-foreground">
                Create unforgettable
                <span className="block text-primary">moments together</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                The easiest way to create beautiful invites and get your guests on the same page.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/create">
                  <Button size="lg" className="text-lg px-8 gap-2">
                    Create Event
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/events">
                  <Button size="lg" variant="outline" className="text-lg px-8 bg-card/50 backdrop-blur-sm">
                    Browse Events
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">
                Fun, modern invites in 1-click
              </h2>
              <p className="text-muted-foreground text-lg">
                100% free, no paywalls. Customize the perfect invite.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center p-6 rounded-xl bg-background border border-border">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Palette className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Beautiful Designs</h3>
                <p className="text-muted-foreground">
                  Stunning backgrounds, fonts, and animations to make your invite pop.
                </p>
              </div>
              
              <div className="text-center p-6 rounded-xl bg-background border border-border">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Easy RSVPs</h3>
                <p className="text-muted-foreground">
                  Track who's coming with one-tap responses. No accounts needed.
                </p>
              </div>
              
              <div className="text-center p-6 rounded-xl bg-background border border-border">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Guest Management</h3>
                <p className="text-muted-foreground">
                  Keep everyone on the same page with updates and reminders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Events Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-foreground">Upcoming Events</h2>
              <Link to="/events">
                <Button variant="ghost" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  date={event.date}
                  time={event.time}
                  location={event.location}
                  image={event.image}
                  attendees={event.attendees}
                  category={event.category}
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to plan your next event?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Create beautiful invites and manage your guest list in minutes.
            </p>
            <Link to="/create">
              <Button size="lg" variant="secondary" className="text-lg px-8 gap-2">
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
