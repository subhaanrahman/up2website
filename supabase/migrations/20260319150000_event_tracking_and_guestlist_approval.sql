-- Event share/click tracking
CREATE TABLE IF NOT EXISTS public.event_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  session_id text,
  action text NOT NULL CHECK (action IN ('share', 'click')),
  channel text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_link_clicks_event_id ON public.event_link_clicks (event_id);
CREATE INDEX IF NOT EXISTS idx_event_link_clicks_created_at ON public.event_link_clicks (created_at);
CREATE INDEX IF NOT EXISTS idx_event_link_clicks_session ON public.event_link_clicks (session_id);

ALTER TABLE public.event_link_clicks ENABLE ROW LEVEL SECURITY;

-- Per-event view tracking (deduped by session + day)
CREATE TABLE IF NOT EXISTS public.event_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  view_date date NOT NULL DEFAULT (now()::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, session_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_event_views_event_id ON public.event_views (event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_created_at ON public.event_views (created_at);

ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;

-- Conversions (confirmed ticket purchases)
CREATE TABLE IF NOT EXISTS public.event_link_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  click_id uuid REFERENCES public.event_link_clicks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_event_link_conversions_event_id ON public.event_link_conversions (event_id);
CREATE INDEX IF NOT EXISTS idx_event_link_conversions_created_at ON public.event_link_conversions (created_at);

ALTER TABLE public.event_link_conversions ENABLE ROW LEVEL SECURITY;

-- Attach referral click to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS referral_click_id uuid REFERENCES public.event_link_clicks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_referral_click_id ON public.orders (referral_click_id);

-- Allow RSVP pending + interested
ALTER TABLE public.rsvps DROP CONSTRAINT IF EXISTS rsvps_status_check;
ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_status_check
  CHECK (status IN ('going', 'maybe', 'not_going', 'interested', 'pending'));

-- Update rsvp_join to enforce guestlist deadline + approval
CREATE OR REPLACE FUNCTION public.rsvp_join(
  p_event_id uuid,
  p_status text DEFAULT 'going',
  p_guest_count integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_max_guests integer;
  v_current_count integer;
  v_is_public boolean;
  v_result jsonb;
  v_safe_guest_count integer;
  v_guestlist_deadline timestamptz;
  v_guestlist_require_approval boolean;
  v_guestlist_enabled boolean;
  v_effective_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clamp guest_count between 1 and 5
  v_safe_guest_count := GREATEST(1, LEAST(p_guest_count, 5));

  SELECT max_guests,
         COALESCE(is_public, true),
         COALESCE(guestlist_enabled, true),
         guestlist_deadline,
         COALESCE(guestlist_require_approval, false)
    INTO v_max_guests, v_is_public, v_guestlist_enabled, v_guestlist_deadline, v_guestlist_require_approval
    FROM events
   WHERE id = p_event_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF NOT v_is_public THEN
    IF NOT EXISTS (
      SELECT 1 FROM events WHERE id = p_event_id AND host_id = v_user_id
    ) AND NOT EXISTS (
      SELECT 1 FROM invites
       WHERE event_id = p_event_id
         AND (invitee_id = v_user_id OR invitee_email = (
           SELECT email FROM auth.users WHERE id = v_user_id
         ))
    ) THEN
      RAISE EXCEPTION 'You do not have access to this event';
    END IF;
  END IF;

  IF NOT v_guestlist_enabled THEN
    RAISE EXCEPTION 'Guestlist is disabled for this event';
  END IF;

  -- Enforce guestlist deadline for RSVP actions (not for "interested")
  IF v_guestlist_deadline IS NOT NULL AND p_status <> 'interested' THEN
    IF now() > v_guestlist_deadline THEN
      RAISE EXCEPTION 'Guestlist is closed';
    END IF;
  END IF;

  -- Determine final status based on approval requirement
  v_effective_status := p_status;
  IF v_guestlist_require_approval AND p_status IN ('going', 'maybe') THEN
    v_effective_status := 'pending';
  END IF;

  -- Capacity check only for immediate "going" RSVPs
  IF v_max_guests IS NOT NULL AND v_effective_status = 'going' THEN
    SELECT COALESCE(SUM(guest_count), 0) INTO v_current_count
      FROM rsvps
     WHERE event_id = p_event_id AND status = 'going';

    IF (v_current_count + v_safe_guest_count) > v_max_guests
       AND NOT EXISTS (
         SELECT 1 FROM rsvps WHERE event_id = p_event_id AND user_id = v_user_id
       )
    THEN
      RAISE EXCEPTION 'Event is at capacity';
    END IF;
  END IF;

  INSERT INTO rsvps (event_id, user_id, status, guest_count)
  VALUES (p_event_id, v_user_id, v_effective_status, v_safe_guest_count)
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = EXCLUDED.status, guest_count = EXCLUDED.guest_count, updated_at = now()
  RETURNING jsonb_build_object(
    'id', id, 'event_id', event_id, 'user_id', user_id,
    'status', status, 'guest_count', guest_count, 'created_at', created_at
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
