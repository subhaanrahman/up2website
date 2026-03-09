import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CreateGroupChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateGroupChatModal = ({ open, onOpenChange }: CreateGroupChatModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const { data: chat, error } = await supabase
        .from("group_chats")
        .insert({ name: name.trim(), member_count: 1 })
        .select()
        .single();

      if (error) throw error;

      // Add creator as member
      await supabase.from("group_chat_members").insert({
        group_chat_id: chat.id,
        user_id: user.id,
      });

      queryClient.invalidateQueries({ queryKey: ["group-chats"] });
      toast({ title: "Group chat created!" });
      setName("");
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to create group", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Group Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="chat-name">Group Name</Label>
            <Input
              id="chat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              maxLength={100}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="w-full"
          >
            {creating ? "Creating…" : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupChatModal;
