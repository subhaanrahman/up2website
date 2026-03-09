
-- Organiser Stripe accounts table for Connect onboarding
CREATE TABLE public.organiser_stripe_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_profile_id uuid REFERENCES public.organiser_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_account_id text NOT NULL,
  onboarding_complete boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.organiser_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Owner can view their own stripe account
CREATE POLICY "Owner can view own stripe account"
  ON public.organiser_stripe_accounts
  FOR SELECT
  TO authenticated
  USING (
    is_organiser_owner(organiser_profile_id, auth.uid())
    OR is_organiser_member(organiser_profile_id, auth.uid())
  );

-- No direct insert/update/delete from client — managed by edge functions only
CREATE POLICY "Service only writes"
  ON public.organiser_stripe_accounts
  FOR ALL
  TO authenticated
  USING (false);

-- Add stripe_account_id to orders for audit trail
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_account_id text;

-- Updated_at trigger
CREATE TRIGGER update_organiser_stripe_accounts_updated_at
  BEFORE UPDATE ON public.organiser_stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
