
-- Create ticket_transfers table for pending transfer requests
CREATE TABLE public.ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT ticket_transfers_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  CONSTRAINT ticket_transfers_not_self CHECK (from_user_id != to_user_id),
  UNIQUE (event_id, from_user_id, status) -- only one pending transfer per event per sender
);

ALTER TABLE public.ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Sender can view their own transfers
CREATE POLICY "Sender can view own transfers"
  ON public.ticket_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id);

-- Recipient can view transfers sent to them
CREATE POLICY "Recipient can view incoming transfers"
  ON public.ticket_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = to_user_id);

-- No direct client writes — all mutations go through RPC/edge functions
CREATE POLICY "No direct client writes"
  ON public.ticket_transfers FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Update rsvp_transfer to create a PENDING transfer instead of immediate transfer
CREATE OR REPLACE FUNCTION public.rsvp_transfer(p_event_id uuid, p_to_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_from_user_id uuid := auth.uid();
  v_transfer_id uuid;
  v_to_display_name text;
BEGIN
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_to_user_id IS NULL OR p_to_user_id = v_from_user_id THEN
    RAISE EXCEPTION 'Invalid transfer recipient';
  END IF;

  -- Require that the recipient is a friend
  IF NOT EXISTS (
    SELECT 1 FROM connections c
    WHERE c.status = 'accepted'
      AND (
        (c.requester_id = v_from_user_id AND c.addressee_id = p_to_user_id)
        OR (c.requester_id = p_to_user_id AND c.addressee_id = v_from_user_id)
      )
  ) THEN
    RAISE EXCEPTION 'You can only transfer to a friend';
  END IF;

  -- Verify sender has an RSVP
  IF NOT EXISTS (
    SELECT 1 FROM rsvps WHERE event_id = p_event_id AND user_id = v_from_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have an RSVP for this event';
  END IF;

  -- Check no pending transfer already exists for this event from this user
  IF EXISTS (
    SELECT 1 FROM ticket_transfers
    WHERE event_id = p_event_id AND from_user_id = v_from_user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending transfer for this event';
  END IF;

  -- Create pending transfer
  INSERT INTO ticket_transfers (event_id, from_user_id, to_user_id, status)
  VALUES (p_event_id, v_from_user_id, p_to_user_id, 'pending')
  RETURNING id INTO v_transfer_id;

  -- Get sender display name for notification
  SELECT COALESCE(display_name, username, 'Someone') INTO v_to_display_name
  FROM profiles WHERE user_id = v_from_user_id;

  -- Notify recipient
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    p_to_user_id,
    'ticket_transfer_request',
    'Ticket Transfer Request',
    v_to_display_name || ' wants to transfer a ticket to you',
    '/tickets?transfer_id=' || v_transfer_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'status', 'pending'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rsvp_transfer(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rsvp_transfer(uuid, uuid) TO authenticated;

-- Function to respond to a transfer (accept or decline)
CREATE OR REPLACE FUNCTION public.rsvp_transfer_respond(p_transfer_id uuid, p_accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_transfer ticket_transfers%ROWTYPE;
  v_status text;
  v_guest_count integer;
  v_ticket_ids uuid[];
  v_from_display_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load and lock the transfer
  SELECT * INTO v_transfer
  FROM ticket_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  IF v_transfer.to_user_id != v_user_id THEN
    RAISE EXCEPTION 'You are not the recipient of this transfer';
  END IF;

  IF v_transfer.status != 'pending' THEN
    RAISE EXCEPTION 'This transfer has already been %', v_transfer.status;
  END IF;

  IF NOT p_accept THEN
    -- Decline
    UPDATE ticket_transfers SET status = 'declined', responded_at = now() WHERE id = p_transfer_id;

    -- Notify sender
    SELECT COALESCE(display_name, username, 'Someone') INTO v_from_display_name
    FROM profiles WHERE user_id = v_user_id;

    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_transfer.from_user_id,
      'ticket_transfer_declined',
      'Transfer Declined',
      v_from_display_name || ' declined your ticket transfer',
      '/tickets'
    );

    RETURN jsonb_build_object('success', true, 'status', 'declined');
  END IF;

  -- Accept: perform the actual transfer
  -- Load sender's RSVP
  SELECT status, guest_count INTO v_status, v_guest_count
  FROM rsvps
  WHERE event_id = v_transfer.event_id AND user_id = v_transfer.from_user_id;

  IF NOT FOUND THEN
    -- Sender no longer has RSVP, cancel
    UPDATE ticket_transfers SET status = 'cancelled', responded_at = now() WHERE id = p_transfer_id;
    RAISE EXCEPTION 'The sender no longer has an RSVP for this event';
  END IF;

  -- Transfer valid tickets
  UPDATE tickets
  SET user_id = v_transfer.to_user_id
  WHERE event_id = v_transfer.event_id
    AND user_id = v_transfer.from_user_id
    AND status = 'valid'
  RETURNING id INTO v_ticket_ids;

  -- Remove sender's RSVP
  DELETE FROM rsvps
  WHERE event_id = v_transfer.event_id AND user_id = v_transfer.from_user_id;

  -- Create recipient RSVP
  INSERT INTO rsvps (event_id, user_id, status, guest_count)
  VALUES (v_transfer.event_id, v_transfer.to_user_id, v_status, COALESCE(v_guest_count, 1))
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = EXCLUDED.status, guest_count = EXCLUDED.guest_count, updated_at = now();

  -- Mark transfer as accepted
  UPDATE ticket_transfers SET status = 'accepted', responded_at = now() WHERE id = p_transfer_id;

  -- Notify sender of acceptance
  SELECT COALESCE(display_name, username, 'Someone') INTO v_from_display_name
  FROM profiles WHERE user_id = v_user_id;

  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    v_transfer.from_user_id,
    'ticket_transfer_accepted',
    'Transfer Accepted',
    v_from_display_name || ' accepted your ticket transfer',
    '/tickets'
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'accepted',
    'tickets_transferred', COALESCE(array_length(v_ticket_ids, 1), 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rsvp_transfer_respond(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rsvp_transfer_respond(uuid, boolean) TO authenticated;

-- Allow sender to cancel a pending transfer
CREATE OR REPLACE FUNCTION public.rsvp_transfer_cancel(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_transfer ticket_transfers%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_transfer FROM ticket_transfers WHERE id = p_transfer_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  IF v_transfer.from_user_id != v_user_id THEN
    RAISE EXCEPTION 'You are not the sender of this transfer';
  END IF;

  IF v_transfer.status != 'pending' THEN
    RAISE EXCEPTION 'This transfer is no longer pending';
  END IF;

  UPDATE ticket_transfers SET status = 'cancelled', responded_at = now() WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION public.rsvp_transfer_cancel(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rsvp_transfer_cancel(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
