
-- 1. Add ticket_tier_id and platform_fee_cents to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ticket_tier_id uuid REFERENCES ticket_tiers(id),
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0;

-- 2. Tickets table — issued after payment confirmed
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_tier_id uuid REFERENCES ticket_tiers(id),
  user_id uuid NOT NULL,
  qr_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'valid',
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Users can view own tickets
CREATE POLICY "Users can view own tickets"
ON public.tickets FOR SELECT
USING (auth.uid() = user_id);

-- 3. Payment events audit log for webhook idempotency
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  stripe_event_id text UNIQUE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- No client access — only service role writes via webhooks
