import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Calendar, Users, Palette } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";
import { events } from "@/data/events";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const featuredEvents = events.slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background" />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
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
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                <Palette className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Beautiful Designs</h3>
              <p className="text-muted-foreground">
                Stunning backgrounds, fonts, and animations to make your invite pop.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-background border border-border">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Easy RSVPs</h3>
              <p className="text-muted-foreground">
                Track who's coming with one-tap responses. No accounts needed.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-background border border-border">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-accent-foreground" />
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

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Index;
