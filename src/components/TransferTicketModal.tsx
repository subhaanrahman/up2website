import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends, type Friend } from "@/hooks/useFriends";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TransferTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onTransferred: () => void;
}

export default function TransferTicketModal({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onTransferred,
}: TransferTicketModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: friends = [], isLoading: friendsLoading } = useFriends(user?.id);

  const [step, setStep] = useState<"list" | "confirm">("list");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep("list");
      setSelectedFriend(null);
      setSearchQuery("");
      setError(null);
    }
  }, [open]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter(
      (f) =>
        f.displayName.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    setStep("confirm");
  };

  const handleBack = () => {
    setStep("list");
    setSelectedFriend(null);
    setError(null);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedFriend) return;
    setTransferring(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("rsvp_transfer", {
        p_event_id: eventId,
        p_to_user_id: selectedFriend.userId,
      });
      if (rpcError) throw rpcError;
      toast({
        title: "Ticket transferred",
        description: `Your ticket has been transferred to ${selectedFriend.displayName}.`,
      });
      onTransferred();
      onOpenChange(false);
    } catch (err: any) {
      const message = err?.message ?? "Failed to transfer ticket";
      setError(message);
      toast({
        title: "Transfer failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Transfer ticket</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {eventTitle}
          </DialogDescription>
        </DialogHeader>

        {step === "list" && (
          <>
            {friendsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : friends.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground space-y-3">
                <p>You don&apos;t have any friends yet.</p>
                <Button variant="outline" asChild>
                  <Link to="/profile/friends">Add friends</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="overflow-y-auto max-h-[280px] space-y-1 -mx-1">
                  {filteredFriends.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground text-sm">
                      No friends match your search.
                    </p>
                  ) : (
                    filteredFriends.map((friend) => (
                      <button
                        key={friend.userId}
                        type="button"
                        onClick={() => handleSelectFriend(friend)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatarUrl ?? undefined} />
                          <AvatarFallback>
                            {friend.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{friend.displayName}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            @{friend.username}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}

        {step === "confirm" && selectedFriend && (
          <>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Transfer this ticket to:
              </p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedFriend.avatarUrl ?? undefined} />
                  <AvatarFallback>
                    {selectedFriend.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedFriend.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    @{selectedFriend.username}
                  </p>
                </div>
              </div>
              {error && (
                <p className="mt-3 text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={transferring}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmTransfer}
                disabled={transferring}
              >
                {transferring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  "Confirm transfer"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
