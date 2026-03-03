import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, MoreVertical } from "lucide-react";

const MessageThread = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  // Mock user data based on id
  const userName = id === "1" ? "DYLAN" : id === "2" ? "NOIR" : "User";

  const [messages, setMessages] = useState([
    { id: "1", text: "Hey! What's up?", fromMe: false, time: "2:30 PM" },
    { id: "2", text: "Not much, you?", fromMe: true, time: "2:31 PM" },
    { id: "3", text: "Wanna hit up that event tonight?", fromMe: false, time: "2:32 PM" },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: String(prev.length + 1), text: message, fromMe: true, time: "Now" },
    ]);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <Link to={`/user/${id}`}>
          <Avatar className="h-9 w-9">
            <AvatarImage src="" />
            <AvatarFallback className="bg-card text-foreground font-semibold text-xs">
              {userName.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link to={`/user/${id}`} className="font-semibold text-foreground text-sm hover:underline">{userName}</Link>
          <p className="text-xs text-muted-foreground">Active now</p>
        </div>
        <button className="p-2 text-muted-foreground"><MoreVertical className="h-5 w-5" /></button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.fromMe
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.fromMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </main>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3 flex items-center gap-2">
        <Input
          placeholder="Message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 bg-secondary border-0 h-10 rounded-full"
        />
        <Button size="icon" className="h-10 w-10 rounded-full" onClick={handleSend} disabled={!message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageThread;
