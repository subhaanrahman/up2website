import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

const mockGroupChats = [
  {
    id: "1",
    name: "Friday Night Out",
    avatars: ["", "", ""],
    lastMessage: "Jordan: Let's meet at 9pm",
    time: "2h",
    memberCount: 6,
    unread: 3,
  },
  {
    id: "2",
    name: "Wedding Squad",
    avatars: ["", ""],
    lastMessage: "Soph: Got the outfits sorted!",
    time: "5h",
    memberCount: 8,
    unread: 0,
  },
  {
    id: "3",
    name: "Rooftop Crew",
    avatars: ["", "", ""],
    lastMessage: "Alex: Table booked for 12",
    time: "8h",
    memberCount: 12,
    unread: 1,
  },
  {
    id: "4",
    name: "Birthday Bash",
    avatars: ["", ""],
    lastMessage: "You: Can't wait 🎉",
    time: "1d",
    memberCount: 15,
    unread: 0,
  },
  {
    id: "5",
    name: "NYE Planning",
    avatars: ["", "", ""],
    lastMessage: "Mike: VIP confirmed",
    time: "1d",
    memberCount: 4,
    unread: 0,
  },
  {
    id: "6",
    name: "Dinner Club",
    avatars: ["", ""],
    lastMessage: "Jas: New spot on King St?",
    time: "2d",
    memberCount: 5,
    unread: 0,
  },
];

const GroupChatTile = ({ chat }: { chat: typeof mockGroupChats[0] }) => (
  <Link
    to={`/messages/${chat.id}`}
    className="group relative flex flex-col justify-between rounded-2xl bg-card border border-border p-4 hover:border-primary/40 transition-all duration-200 hover:shadow-md min-h-[160px]"
  >
    {/* Unread badge */}
    {chat.unread > 0 && (
      <span className="absolute top-3 right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
        {chat.unread}
      </span>
    )}

    {/* Stacked avatars */}
    <div className="flex -space-x-2 mb-3">
      {chat.avatars.slice(0, 3).map((_, i) => (
        <Avatar key={i} className="h-8 w-8 border-2 border-card">
          <AvatarImage src="" />
          <AvatarFallback className="bg-secondary text-foreground text-[10px] font-semibold">
            {chat.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      ))}
      {chat.memberCount > 3 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
          +{chat.memberCount - 3}
        </div>
      )}
    </div>

    {/* Info */}
    <div className="flex-1 flex flex-col justify-end gap-1">
      <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
        {chat.name}
      </h3>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {chat.lastMessage}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" />
          {chat.memberCount}
        </span>
        <span className="text-[10px] text-muted-foreground">{chat.time}</span>
      </div>
    </div>
  </Link>
);

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">GROUP CHATS</h1>
        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full">
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {/* Grid */}
      <main className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {mockGroupChats.map((chat) => (
            <GroupChatTile key={chat.id} chat={chat} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
