
-- Add status column to events for draft support
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

-- Add genre/style/vibes tags as JSONB
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- Add guestlist settings columns
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS guestlist_enabled boolean DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS guestlist_deadline timestamp with time zone DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS guestlist_require_approval boolean DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS guestlist_max_capacity integer DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS show_tickets_remaining boolean DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS sold_out_message text DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tickets_available_from timestamp with time zone DEFAULT NULL;

-- Ticket tiers table
CREATE TABLE public.ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  available_quantity integer DEFAULT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event host can manage ticket tiers" ON public.ticket_tiers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_tiers.event_id AND events.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_tiers.event_id AND events.host_id = auth.uid()));

CREATE POLICY "Public can view ticket tiers" ON public.ticket_tiers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_tiers.event_id AND events.is_public = true));

-- Discount codes table
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  ticket_limit_type text NOT NULL DEFAULT 'unlimited',
  ticket_limit_amount integer DEFAULT NULL,
  reveal_hidden_tickets boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event host can manage discount codes" ON public.discount_codes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = discount_codes.event_id AND events.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = discount_codes.event_id AND events.host_id = auth.uid()));

-- Event reminders table
CREATE TABLE public.event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  reminder_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event host can manage reminders" ON public.event_reminders
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_reminders.event_id AND events.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_reminders.event_id AND events.host_id = auth.uid()));
