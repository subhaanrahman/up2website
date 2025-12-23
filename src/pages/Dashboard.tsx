import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

// Mock messages data
const mockMessages = [
  {
    id: "1",
    name: "Dylan",
    avatar: "",
    lastMessage: "whats up bro what you upto lets go ou...",
    time: "8h",
    isGroup: false,
  },
  {
    id: "2",
    name: "Groupchat",
    avatar: "",
    lastMessage: "Jordan: Hey guys lets go to this thing",
    time: "8h",
    isGroup: true,
  },
  {
    id: "3",
    name: "Dylan",
    avatar: "",
    lastMessage: "whats up bro what you upto lets go...",
    time: "8h",
    isGroup: false,
  },
  {
    id: "4",
    name: "Dylan",
    avatar: "",
    lastMessage: "whats up bro what you upto lets go ou...",
    time: "8h",
    isGroup: false,
  },
  {
    id: "5",
    name: "Dylan",
    avatar: "",
    lastMessage: "whats up bro what you upto lets go ou...",
    time: "8h",
    isGroup: false,
  },
  {
    id: "6",
    name: "Dylan",
    avatar: "",
    lastMessage: "whats up bro what you upto lets go ou...",
    time: "8h",
    isGroup: false,
  },
  {
    id: "7",
    name: "Groupchat",
    avatar: "",
    lastMessage: "Jordan: Hey guys lets go to this thing",
    time: "8h",
    isGroup: true,
  },
];

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect to auth if not logged in
  if (!loading && !user) {
    navigate("/auth");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const filteredMessages = mockMessages.filter((msg) =>
    msg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">MESSAGES</h1>
        
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

      {/* Messages List */}
      <main className="px-0">
        <div className="divide-y divide-border/50">
          {filteredMessages.map((message) => (
            <Link
              key={message.id}
              to={`/messages/${message.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
            >
              <Avatar className="h-14 w-14 flex-shrink-0">
                <AvatarImage src={message.avatar} />
                <AvatarFallback className="bg-card text-foreground font-semibold">
                  {message.name[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{message.name}</h3>
                  <span className="text-sm text-muted-foreground">· {message.time}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {message.lastMessage}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Loading skeleton placeholders */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-14 w-14 rounded-full bg-secondary animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
              <div className="h-3 w-48 bg-secondary rounded animate-pulse" />
            </div>
          </div>
        ))}
      </main>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <BottomNav />
    </div>
  );
};

export default Dashboard;