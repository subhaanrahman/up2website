import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserRank,
  PointAction,
} from "@/lib/gamification";

interface UserPointsData {
  total_points: number;
  current_rank: UserRank;
}

interface Voucher {
  id: string;
  code: string;
  value_cents: number;
  status: string;
  earned_at_rank: UserRank;
  expires_at: string | null;
  used_at: string | null;
}

interface PointTransaction {
  id: string;
  points: number;
  action_type: string;
  description: string | null;
  created_at: string;
}

interface GamificationContextType {
  points: number;
  rank: UserRank;
  vouchers: Voucher[];
  transactions: PointTransaction[];
  loading: boolean;
  awardPoints: (action: PointAction, description?: string) => Promise<{ awarded: number; leveledUp: boolean }>;
  refreshData: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export const GamificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState<UserRank>('bronze');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch or create user points
      let { data: pointsData } = await supabase
        .from("user_points")
        .select("total_points, current_rank")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!pointsData) {
        // Create initial record
        const { data: newData } = await supabase
          .from("user_points")
          .insert({ user_id: user.id, total_points: 0, current_rank: 'bronze' })
          .select("total_points, current_rank")
          .single();
        pointsData = newData;
      }

      if (pointsData) {
        setPoints(pointsData.total_points);
        setRank(pointsData.current_rank as UserRank);
      }

      // Fetch vouchers
      const { data: vouchersData } = await supabase
        .from("user_vouchers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (vouchersData) {
        setVouchers(vouchersData as Voucher[]);
      }

      // Fetch recent transactions
      const { data: transactionsData } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (transactionsData) {
        setTransactions(transactionsData as PointTransaction[]);
      }
    } catch (error) {
      console.error("Error fetching gamification data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("gamification_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_points",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const data = payload.new as UserPointsData;
            setPoints(data.total_points);
            setRank(data.current_rank);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const awardPoints = useCallback(
    async (action: PointAction, description?: string) => {
      if (!user) return { awarded: 0, leveledUp: false };

      try {
        // Use server-side RPC — all validation, calculation, and writes happen server-side
        const { data, error } = await supabase.rpc('award_points', {
          p_action_type: action,
          p_description: description || null,
        });

        if (error) {
          console.error("Error awarding points:", error);
          return { awarded: 0, leveledUp: false };
        }

        const result = data as { awarded: number; leveled_up: boolean; new_rank: string; new_total: number };

        // Update local state from server response
        setPoints(result.new_total);
        setRank(result.new_rank as UserRank);

        // Refresh vouchers if leveled up
        if (result.leveled_up) {
          const { data: vouchersData } = await supabase
            .from("user_vouchers")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (vouchersData) setVouchers(vouchersData as Voucher[]);
        }

        return { awarded: result.awarded, leveledUp: result.leveled_up };
      } catch (error) {
        console.error("Error awarding points:", error);
        return { awarded: 0, leveledUp: false };
      }
    },
    [user]
  );

  return (
    <GamificationContext.Provider
      value={{
        points,
        rank,
        vouchers,
        transactions,
        loading,
        awardPoints,
        refreshData: fetchData,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
};
