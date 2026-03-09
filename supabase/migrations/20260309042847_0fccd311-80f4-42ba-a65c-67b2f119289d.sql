
-- Create security definer function to check group membership (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Drop and recreate messages SELECT policy to use the new function
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id 
  OR auth.uid() = receiver_id 
  OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

-- Fix group_members SELECT policy to avoid self-referencing recursion
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
TO authenticated
USING (
  public.is_group_member(auth.uid(), group_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix group_members UPDATE policy too
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
CREATE POLICY "Group admins can manage members"
ON public.group_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
