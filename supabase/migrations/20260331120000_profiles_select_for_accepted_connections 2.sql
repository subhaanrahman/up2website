-- Friend list / feed loads profiles with .in('user_id', friendIds).
-- "Profiles viewable by owner or if public" hides other users when go_public is false.
-- Count RPCs (SECURITY DEFINER) still worked; direct profile SELECT returned 0 rows.

CREATE POLICY "Accepted connections can view friend profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.connections c
      WHERE c.status = 'accepted'
        AND (
          (c.requester_id = auth.uid() AND c.addressee_id = user_id)
          OR (c.addressee_id = auth.uid() AND c.requester_id = user_id)
        )
    )
  );
