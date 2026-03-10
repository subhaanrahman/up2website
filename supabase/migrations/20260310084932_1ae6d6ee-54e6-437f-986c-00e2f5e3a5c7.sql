
-- 2. Enhanced reports table (extend existing)
-- Add new columns to existing reports table
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'post',
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill target_type/target_id from legacy columns
UPDATE public.reports
SET target_type = CASE
  WHEN reported_post_id IS NOT NULL THEN 'post'
  WHEN reported_user_id IS NOT NULL THEN 'user'
  ELSE 'post'
END,
target_id = COALESCE(reported_post_id, reported_user_id);

-- Add updated_at trigger
CREATE TRIGGER set_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Admin can view/manage all reports
CREATE POLICY "Admins can manage all reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
