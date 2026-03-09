
-- Create a security definer function to check group membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_chat_member(p_group_chat_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_chat_members
    WHERE group_chat_id = p_group_chat_id AND user_id = p_user_id
  );
$$;

-- Drop and recreate the INSERT policy to use the function
DROP POLICY IF EXISTS "Authenticated can add members to groups they belong to" ON public.group_chat_members;

CREATE POLICY "Authenticated can add members to groups they belong to"
ON public.group_chat_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.is_group_chat_member(group_chat_id, auth.uid())
);

-- Also fix the SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Members can view group members" ON public.group_chat_members;

CREATE POLICY "Members can view group members"
ON public.group_chat_members
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_group_chat_member(group_chat_id, auth.uid())
);
