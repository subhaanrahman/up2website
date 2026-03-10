
-- 3. Support requests table
CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  message text NOT NULL,
  context_metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  assigned_admin_id uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Users can view their own requests
CREATE POLICY "Users can view own support requests"
  ON public.support_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No direct client inserts (use edge function)
CREATE POLICY "No client writes to support_requests"
  ON public.support_requests FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Admins can manage all
CREATE POLICY "Admins can manage all support requests"
  ON public.support_requests FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Moderation actions audit log
CREATE TABLE public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  action_type text NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs; writes via service role only
CREATE POLICY "Admins can view moderation actions"
  ON public.moderation_actions FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "No client writes to moderation_actions"
  ON public.moderation_actions FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
