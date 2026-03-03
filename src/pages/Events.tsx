import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, X, BadgeCheck } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";

// Mock recent searches data
const recentSearches = [
  {
    id: "1",
    name: "DYLAN",
    avatar: "",
    relationship: "Friends",
    verified: false,
  },
  {
    id: "2",
    name: "NOIR",
    avatar: "",
    relationship: "Following",
    verified: true,
  },
];

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentItems, setRecentItems] = useState(recentSearches);

  const handleRemoveRecent = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRecentItems((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredItems = recentItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Mobile Search Page */}
      <div className="md:hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">SEARCH</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-0 h-10"
            />
          </div>
        </header>

        {/* Recent Section */}
        <main className="px-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent</h2>

          {/* Recent Searches List */}
          <div className="space-y-0">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                to={`/user/${item.id}`}
                className="flex items-center gap-3 py-3 hover:bg-secondary/30 transition-colors -mx-4 px-4"
              >
                <Avatar className="h-14 w-14 flex-shrink-0">
                  <AvatarImage src={item.avatar} />
                  <AvatarFallback className="bg-card text-foreground font-semibold text-sm">
                    {item.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    {item.verified && (
                      <BadgeCheck className="h-4 w-4 text-primary fill-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.relationship}</p>
                </div>

                <button
                  onClick={(e) => handleRemoveRecent(item.id, e)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </Link>
            ))}
          </div>

          {/* Loading skeleton placeholders */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="h-14 w-14 rounded-full bg-secondary animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
              </div>
            </div>
          ))}
        </main>
      </div>

      {/* Desktop View - Keep existing grid */}
      <main className="hidden md:block pt-24 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-2">Search</h1>
          <p className="text-muted-foreground mb-8">Find people and events</p>

          <div className="relative max-w-md mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Start typing to search for people and events</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Events;
