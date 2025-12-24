import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserRank,
  PointAction,
  POINT_VALUES,
  calculateRank,
  generateVoucherCode,
  VOUCHER_VALUE_CENTS,
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

      const pointsToAward = POINT_VALUES[action];
      const newTotal = points + pointsToAward;
      const oldRank = rank;
      const newRank = calculateRank(newTotal);
      const leveledUp = newRank !== oldRank;

      try {
        // Update points
        await supabase
          .from("user_points")
          .update({ total_points: newTotal, current_rank: newRank })
          .eq("user_id", user.id);

        // Record transaction
        await supabase.from("point_transactions").insert({
          user_id: user.id,
          points: pointsToAward,
          action_type: action,
          description: description || null,
        });

        // Award voucher if leveled up
        if (leveledUp) {
          await supabase.from("user_vouchers").insert({
            user_id: user.id,
            code: generateVoucherCode(),
            value_cents: VOUCHER_VALUE_CENTS,
            status: "available",
            earned_at_rank: newRank,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          });
        }

        // Update local state
        setPoints(newTotal);
        setRank(newRank);

        // Refresh vouchers if leveled up
        if (leveledUp) {
          const { data: vouchersData } = await supabase
            .from("user_vouchers")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (vouchersData) setVouchers(vouchersData as Voucher[]);
        }

        return { awarded: pointsToAward, leveledUp };
      } catch (error) {
        console.error("Error awarding points:", error);
        return { awarded: 0, leveledUp: false };
      }
    },
    [user, points, rank]
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
