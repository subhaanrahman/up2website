import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase";

export interface PendingTransfer {
  id: string;
  event_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
}

/** Returns outgoing pending transfers for the current user */
export function usePendingTransfers(userId: string | undefined) {
  return useQuery({
    queryKey: ["pending-transfers", userId],
    queryFn: async (): Promise<PendingTransfer[]> => {
      const { data, error } = await supabase
        .from("ticket_transfers")
        .select("*")
        .eq("from_user_id", userId!)
        .eq("status", "pending");
      if (error) throw error;
      return (data || []) as PendingTransfer[];
    },
    enabled: !!userId,
  });
}

/** Returns incoming pending transfers for the current user */
export function useIncomingTransfers(userId: string | undefined) {
  return useQuery({
    queryKey: ["incoming-transfers", userId],
    queryFn: async (): Promise<PendingTransfer[]> => {
      const { data, error } = await supabase
        .from("ticket_transfers")
        .select("*")
        .eq("to_user_id", userId!)
        .eq("status", "pending");
      if (error) throw error;
      return (data || []) as PendingTransfer[];
    },
    enabled: !!userId,
  });
}

export function useRespondToTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transferId, accept }: { transferId: string; accept: boolean }) => {
      const { data, error } = await supabase.rpc("rsvp_transfer_respond" as any, {
        p_transfer_id: transferId,
        p_accept: accept,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["incoming-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["userPlannedEvents"] });
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transferId: string) => {
      const { data, error } = await supabase.rpc("rsvp_transfer_cancel" as any, {
        p_transfer_id: transferId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-transfers"] });
    },
  });
}
