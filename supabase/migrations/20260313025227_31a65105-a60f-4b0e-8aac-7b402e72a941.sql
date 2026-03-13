
-- Fix has_role to treat super_admin as having admin privileges
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND (role = _role OR (role = 'super_admin' AND _role IN ('admin', 'moderator', 'user')))
  )
$$;

-- Add category column to profiles for user categories
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category text DEFAULT null;

-- Add referral_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text DEFAULT null;

-- Add heard_from column to profiles  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_from text DEFAULT null;

-- Add signup_purpose column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_purpose text DEFAULT null;

-- Add is_white_tick column for first 5 users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_white_tick boolean DEFAULT false;
