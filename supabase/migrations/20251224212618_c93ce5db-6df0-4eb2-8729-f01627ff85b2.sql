-- Create enum for ranks
CREATE TYPE public.user_rank AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- Create user_points table to track total points and rank
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  current_rank user_rank NOT NULL DEFAULT 'bronze',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create point_transactions table for history
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  action_type text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user_vouchers table for earned coupons
CREATE TABLE public.user_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  value_cents integer NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'available',
  earned_at_rank user_rank NOT NULL,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user_badges table for unlocked badges
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, badge_type)
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_points
CREATE POLICY "Users can view own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own points" ON public.user_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own points" ON public.user_points FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for point_transactions
CREATE POLICY "Users can view own transactions" ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.point_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for user_vouchers
CREATE POLICY "Users can view own vouchers" ON public.user_vouchers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vouchers" ON public.user_vouchers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vouchers" ON public.user_vouchers FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for user_badges
CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_points_updated_at
BEFORE UPDATE ON public.user_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_vouchers;