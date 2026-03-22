-- VIP availability RPC + refunds

CREATE TABLE IF NOT EXISTS public.vip_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_reservation_id uuid REFERENCES public.vip_table_reservations(id) ON DELETE CASCADE NOT NULL,
  stripe_refund_id text,
  amount_cents integer NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  initiated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vip_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own VIP refunds"
  ON public.vip_refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vip_table_reservations vtr
      WHERE vtr.id = vip_refunds.vip_reservation_id
        AND vtr.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can view VIP refunds"
  ON public.vip_refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vip_table_reservations vtr
      JOIN public.events e ON e.id = vtr.event_id
      WHERE vtr.id = vip_refunds.vip_reservation_id
        AND (
          e.host_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.organiser_profiles op
            WHERE op.id = e.organiser_profile_id
              AND op.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.organiser_members om
            WHERE om.organiser_profile_id = e.organiser_profile_id
              AND om.user_id = auth.uid()
              AND om.status = 'accepted'
          )
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_vip_refunds_reservation_id ON public.vip_refunds(vip_reservation_id);

CREATE INDEX IF NOT EXISTS idx_vip_reservations_active
  ON public.vip_table_reservations(vip_table_tier_id, status, expires_at)
  WHERE status IN ('reserved', 'confirmed');

CREATE OR REPLACE FUNCTION public.get_vip_table_tiers_public(p_event_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  min_spend_cents integer,
  available_quantity integer,
  max_guests integer,
  included_items jsonb,
  sort_order integer,
  available_remaining integer,
  sold_out boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.description,
    t.min_spend_cents,
    t.available_quantity,
    t.max_guests,
    t.included_items,
    t.sort_order,
    GREATEST(t.available_quantity - COALESCE(r.active_count, 0), 0) AS available_remaining,
    (t.available_quantity - COALESCE(r.active_count, 0)) <= 0 AS sold_out
  FROM public.vip_table_tiers t
  JOIN public.events e ON e.id = t.event_id
  LEFT JOIN (
    SELECT
      vip_table_tier_id,
      COUNT(*) AS active_count
    FROM public.vip_table_reservations
    WHERE status = 'confirmed'
       OR (status = 'reserved' AND expires_at > now())
    GROUP BY vip_table_tier_id
  ) r ON r.vip_table_tier_id = t.id
  WHERE t.event_id = p_event_id
    AND t.is_active = true
    AND e.is_public = true
    AND COALESCE(e.vip_tables_enabled, false) = true
  ORDER BY t.sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_vip_table_tiers_public(uuid) TO anon, authenticated;
