
-- Fix overly permissive group_chat_members policies
DROP POLICY IF EXISTS "Authenticated can add members" ON public.group_chat_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.group_chat_members;

-- Only allow members of the group to view, and only group creator/existing members to add
CREATE POLICY "Members can view group members"
  ON public.group_chat_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members gcm
      WHERE gcm.group_chat_id = group_chat_members.group_chat_id
        AND gcm.user_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Authenticated can add members to groups they belong to"
  ON public.group_chat_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.group_chat_members gcm
      WHERE gcm.group_chat_id = group_chat_members.group_chat_id
        AND gcm.user_id = auth.uid()
    )
  );

-- Add missing policies for rate_limits and payment_events  
CREATE POLICY "Service only rate limits"
  ON public.rate_limits FOR ALL TO authenticated
  USING (false);

CREATE POLICY "Service only payment events"
  ON public.payment_events FOR ALL TO authenticated
  USING (false);
