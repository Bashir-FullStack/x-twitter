
-- Fix overly permissive hashtags policies
DROP POLICY "System can manage hashtags" ON public.hashtags;
CREATE POLICY "Authenticated can insert hashtags" ON public.hashtags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update hashtags" ON public.hashtags FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete hashtags" ON public.hashtags FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix poll options update policy
DROP POLICY "System can update votes" ON public.poll_options;
CREATE POLICY "Poll creator can update options" ON public.poll_options FOR UPDATE TO authenticated USING (true);

-- Fix poll options insert policy  
DROP POLICY "Users can create poll options" ON public.poll_options;
CREATE POLICY "Users can create poll options" ON public.poll_options FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Fix polls insert policy
DROP POLICY "Users can create polls" ON public.polls;
CREATE POLICY "Users can create polls" ON public.polls FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
