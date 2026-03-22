-- Backfill ticket prices from event descriptions like:
-- "Cheapest ticket: $50.00", "Cheapest tticket: $50.00", or "Cheapest ticket: Free"

WITH parsed_prices AS (
  SELECT
    e.id AS event_id,
    CASE
      WHEN m[2] IS NOT NULL THEN 0
      ELSE ROUND((m[1])::numeric * 100)::integer
    END AS parsed_price_cents
  FROM public.events e
  CROSS JOIN LATERAL regexp_match(
    lower(COALESCE(e.description, '')),
    'cheapest\s*t+icket\s*:\s*(?:\$\s*([0-9]+(?:\.[0-9]{1,2})?)|(free))'
  ) AS m
)
UPDATE public.events e
SET ticket_price_cents = p.parsed_price_cents
FROM parsed_prices p
WHERE e.id = p.event_id
  AND e.ticket_price_cents = 0;

WITH parsed_prices AS (
  SELECT
    e.id AS event_id,
    CASE
      WHEN m[2] IS NOT NULL THEN 0
      ELSE ROUND((m[1])::numeric * 100)::integer
    END AS parsed_price_cents
  FROM public.events e
  CROSS JOIN LATERAL regexp_match(
    lower(COALESCE(e.description, '')),
    'cheapest\s*t+icket\s*:\s*(?:\$\s*([0-9]+(?:\.[0-9]{1,2})?)|(free))'
  ) AS m
)
INSERT INTO public.ticket_tiers (event_id, name, price_cents, available_quantity, sort_order)
SELECT
  p.event_id,
  'General Admission',
  p.parsed_price_cents,
  NULL,
  0
FROM parsed_prices p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ticket_tiers t
  WHERE t.event_id = p.event_id
);

-- Verify
SELECT count(*) AS parsed_events
FROM public.events
WHERE description ~* 'cheapest\s*t+icket\s*:'
  AND ticket_price_cents >= 0;

SELECT count(*) AS seeded_general_admission_tiers
FROM public.ticket_tiers
WHERE name = 'General Admission' AND sort_order = 0;
