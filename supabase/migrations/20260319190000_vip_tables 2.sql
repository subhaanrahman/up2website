-- VIP Tables: schema + enablement flag
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS vip_tables_enabled boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.vip_table_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text NULL,
  min_spend_cents integer NOT NULL DEFAULT 0,
  available_quantity integer NOT NULL DEFAULT 0,
  max_guests integer NOT NULL DEFAULT 1,
  included_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vip_table_tiers_min_spend CHECK (min_spend_cents >= 0),
  CONSTRAINT vip_table_tiers_available_qty CHECK (available_quantity >= 0),
  CONSTRAINT vip_table_tiers_max_guests CHECK (max_guests >= 1)
);

ALTER TABLE public.vip_table_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can manage VIP table tiers"
  ON public.vip_table_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = vip_table_tiers.event_id
        AND e.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_profiles op ON op.id = e.organiser_profile_id
      WHERE e.id = vip_table_tiers.event_id
        AND op.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_members om ON om.organiser_profile_id = e.organiser_profile_id
      WHERE e.id = vip_table_tiers.event_id
        AND om.user_id = auth.uid()
        AND om.status = 'accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = vip_table_tiers.event_id
        AND e.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_profiles op ON op.id = e.organiser_profile_id
      WHERE e.id = vip_table_tiers.event_id
        AND op.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_members om ON om.organiser_profile_id = e.organiser_profile_id
      WHERE e.id = vip_table_tiers.event_id
        AND om.user_id = auth.uid()
        AND om.status = 'accepted'
    )
  );

CREATE POLICY "Public can view VIP table tiers"
  ON public.vip_table_tiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = vip_table_tiers.event_id
        AND e.is_public = true
        AND COALESCE(e.vip_tables_enabled, false) = true
    )
  );

CREATE TABLE IF NOT EXISTS public.vip_table_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  vip_table_tier_id uuid REFERENCES public.vip_table_tiers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  guest_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'reserved',
  amount_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'zar',
  stripe_payment_intent_id text NULL,
  stripe_account_id text NULL,
  special_requests text NULL,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  confirmed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vip_reservation_guest_count CHECK (guest_count >= 1 AND guest_count <= 20),
  CONSTRAINT vip_reservation_status CHECK (status IN ('reserved', 'confirmed', 'cancelled', 'expired'))
);

ALTER TABLE public.vip_table_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own VIP reservations"
  ON public.vip_table_reservations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts can view VIP reservations"
  ON public.vip_table_reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = vip_table_reservations.event_id
        AND e.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_profiles op ON op.id = e.organiser_profile_id
      WHERE e.id = vip_table_reservations.event_id
        AND op.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_members om ON om.organiser_profile_id = e.organiser_profile_id
      WHERE e.id = vip_table_reservations.event_id
        AND om.user_id = auth.uid()
        AND om.status = 'accepted'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vip_table_tiers_event_id ON public.vip_table_tiers(event_id);
CREATE INDEX IF NOT EXISTS idx_vip_table_tiers_event_sort ON public.vip_table_tiers(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_vip_table_reservations_event_id ON public.vip_table_reservations(event_id);
CREATE INDEX IF NOT EXISTS idx_vip_table_reservations_tier_id ON public.vip_table_reservations(vip_table_tier_id);
CREATE INDEX IF NOT EXISTS idx_vip_table_reservations_user_id ON public.vip_table_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_table_reservations_status ON public.vip_table_reservations(status);
CREATE INDEX IF NOT EXISTS idx_vip_table_reservations_expires_at ON public.vip_table_reservations(expires_at) WHERE status = 'reserved';

-- updated_at triggers
CREATE TRIGGER update_vip_table_tiers_updated_at
  BEFORE UPDATE ON public.vip_table_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vip_table_reservations_updated_at
  BEFORE UPDATE ON public.vip_table_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
