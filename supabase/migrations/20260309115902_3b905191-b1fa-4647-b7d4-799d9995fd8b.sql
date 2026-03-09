
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  stripe_refund_id text,
  amount_cents integer NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  initiated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Only the order owner can view their refunds
CREATE POLICY "Users can view own refunds"
  ON public.refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = refunds.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- No client writes — managed by edge functions only
