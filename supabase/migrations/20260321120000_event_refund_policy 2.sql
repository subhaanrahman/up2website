-- Organiser-configurable ticket refund policy for self-service refunds
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS refunds_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_policy_text text,
  ADD COLUMN IF NOT EXISTS refund_deadline_hours_before_event integer;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_refund_deadline_hours_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_refund_deadline_hours_check
  CHECK (
    refund_deadline_hours_before_event IS NULL
    OR (refund_deadline_hours_before_event >= 0 AND refund_deadline_hours_before_event <= 168)
  );

COMMENT ON COLUMN public.events.refunds_enabled IS 'When true, order owners may request automatic refunds via refunds-request-self (subject to deadline).';
COMMENT ON COLUMN public.events.refund_policy_text IS 'Optional organiser-facing copy shown on event / tickets.';
COMMENT ON COLUMN public.events.refund_deadline_hours_before_event IS 'If set, self-service refunds only until event_date minus this many hours; NULL = only before event starts.';
