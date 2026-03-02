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
      </header>

      {/* Coming Soon */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
        <p className="text-muted-foreground text-center text-sm max-w-[260px]">
          Direct messaging is on its way. Stay tuned for updates!
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;