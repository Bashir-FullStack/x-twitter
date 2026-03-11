
-- Fix: Allow admins to update any profile (for blue tick management)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Fix: Allow admins to manage suggested_follows (insert with check)
DROP POLICY IF EXISTS "Admins can manage suggested follows" ON public.suggested_follows;
CREATE POLICY "Admins can manage suggested follows" ON public.suggested_follows
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
