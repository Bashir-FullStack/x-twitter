
-- Auto-verify admins: create a trigger that sets is_verified=true when admin role is assigned
CREATE OR REPLACE FUNCTION public.auto_verify_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role IN ('admin', 'super_admin') THEN
    UPDATE public.profiles SET is_verified = true WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_admin_role_assigned
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_verify_admin();

-- Create a post_images storage bucket for post uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload post images
CREATE POLICY "Users can upload post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Post images are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-images');

CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Verify existing admins
UPDATE public.profiles SET is_verified = true 
WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'super_admin'));
