import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Eventful</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/events" className="hover:text-foreground transition-colors">
              Events
            </Link>
            <Link to="/create" className="hover:text-foreground transition-colors">
              Create Event
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Eventful. Plan events in seconds.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
