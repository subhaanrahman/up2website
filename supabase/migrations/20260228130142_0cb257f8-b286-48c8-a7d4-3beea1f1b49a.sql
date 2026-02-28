
-- 1. Drop permissive write policies on gamification tables
DROP POLICY IF EXISTS "Users can update own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can insert own vouchers" ON public.user_vouchers;
DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;

-- 2. Create server-side award_points function
CREATE OR REPLACE FUNCTION public.award_points(
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
  v_user_id UUID := auth.uid();
  v_current_points INTEGER;
  v_new_total INTEGER;
  v_old_rank user_rank;
  v_new_rank user_rank;
  v_leveled_up BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate action type and get points (hardcoded server-side)
  v_points := CASE p_action_type
    WHEN 'add_friend' THEN 5
    WHEN 'save_event' THEN 5
    WHEN 'like_post' THEN 5
    WHEN 'follow_organiser' THEN 10
    WHEN 'share_event' THEN 10
    WHEN 'rsvp_event' THEN 25
    WHEN 'buy_ticket' THEN 50
    WHEN 'create_event' THEN 50
    WHEN 'app_review' THEN 50
    ELSE 0
  END;

  IF v_points = 0 THEN
    RAISE EXCEPTION 'Invalid action type: %', p_action_type;
  END IF;

  -- Get current points with row lock to prevent race conditions
  SELECT total_points, current_rank INTO v_current_points, v_old_rank
  FROM user_points
  WHERE user_id = v_user_id
  FOR UPDATE;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_points (user_id, total_points, current_rank)
    VALUES (v_user_id, 0, 'bronze')
    RETURNING total_points, current_rank INTO v_current_points, v_old_rank;
  END IF;

  -- Calculate new values
  v_new_total := v_current_points + v_points;
  v_new_rank := CASE
    WHEN v_new_total >= 4000 THEN 'diamond'::user_rank
    WHEN v_new_total >= 3000 THEN 'platinum'::user_rank
    WHEN v_new_total >= 2000 THEN 'gold'::user_rank
    WHEN v_new_total >= 1000 THEN 'silver'::user_rank
    ELSE 'bronze'::user_rank
  END;

  v_leveled_up := v_new_rank != v_old_rank;

  -- Update points
  UPDATE user_points
  SET total_points = v_new_total, current_rank = v_new_rank, updated_at = now()
  WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO point_transactions (user_id, points, action_type, description)
  VALUES (v_user_id, v_points, p_action_type, p_description);

  -- Award voucher if leveled up
  IF v_leveled_up THEN
    INSERT INTO user_vouchers (user_id, code, value_cents, earned_at_rank, status, expires_at)
    VALUES (
      v_user_id,
      'REWARD-' || upper(substr(gen_random_uuid()::text, 1, 8)),
      500,
      v_new_rank,
      'available',
      now() + INTERVAL '90 days'
    );
  END IF;

  RETURN jsonb_build_object(
    'awarded', v_points,
    'leveled_up', v_leveled_up,
    'new_rank', v_new_rank::text,
    'new_total', v_new_total
  );
END;
$$;
