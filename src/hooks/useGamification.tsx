import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loyaltyService } from "@/features/loyalty";
import { loyaltyApi } from "@/api";
import type { UserRank, PointAction, Voucher, PointTransaction } from "@/features/loyalty";

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
  const [loading, setLoading] = useState(false); // Start false — non-blocking
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [pts, vchs, txns] = await Promise.all([
        loyaltyService.getUserPoints(user.id),
        loyaltyService.getVouchers(user.id),
        loyaltyService.getTransactions(user.id),
      ]);

      setPoints(pts.totalPoints);
      setRank(pts.currentRank);
      setVouchers(vchs);
      setTransactions(txns);
    } catch (error) {
      console.error("Error fetching gamification data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // DEFERRED: Wait 2s after auth to fetch gamification data
  // so it doesn't compete with critical login bootstrap
  useEffect(() => {
    if (!user) {
      fetchedRef.current = false;
      setLoading(false);
      return;
    }
    if (fetchedRef.current) return;

    const timer = setTimeout(() => {
      fetchedRef.current = true;
      fetchData();
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, fetchData]);

  // Subscribe to realtime updates via repository
  useEffect(() => {
    if (!user) return;
    return loyaltyService.subscribeToPoints(user.id, (data) => {
      setPoints(data.totalPoints);
      setRank(data.currentRank);
    });
  }, [user]);

  const awardPoints = useCallback(
    async (action: PointAction, description?: string) => {
      if (!user) return { awarded: 0, leveledUp: false };

      try {
        const result = await loyaltyApi.awardPoints(action, description);
        setPoints(result.newTotal);
        setRank(result.newRank as UserRank);

        if (result.leveledUp) {
          const vchs = await loyaltyService.getVouchers(user.id);
          setVouchers(vchs);
        }

        return { awarded: result.awarded, leveledUp: result.leveledUp };
      } catch (error) {
        console.error("Error awarding points:", error);
        return { awarded: 0, leveledUp: false };
      }
    },
    [user]
  );

  return (
    <GamificationContext.Provider
      value={{ points, rank, vouchers, transactions, loading, awardPoints, refreshData: fetchData }}
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
