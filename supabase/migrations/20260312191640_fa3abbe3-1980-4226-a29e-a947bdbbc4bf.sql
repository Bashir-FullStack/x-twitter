-- Gamification tables
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_streak_date date,
  total_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '🏆',
  category text NOT NULL DEFAULT 'general',
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL DEFAULT 1,
  points_reward integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view points" ON public.user_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own points" ON public.user_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own points" ON public.user_points FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view user achievements" ON public.user_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can earn achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points_reward) VALUES
('First Post', 'Create your first post', '📝', 'content', 'posts', 1, 10),
('Prolific Writer', 'Create 10 posts', '✍️', 'content', 'posts', 10, 50),
('Content Machine', 'Create 50 posts', '🤖', 'content', 'posts', 50, 200),
('First Like', 'Get your first like', '❤️', 'engagement', 'likes_received', 1, 5),
('Popular', 'Get 50 likes', '🔥', 'engagement', 'likes_received', 50, 100),
('Viral', 'Get 500 likes', '💥', 'engagement', 'likes_received', 500, 500),
('Social Butterfly', 'Follow 10 people', '🦋', 'social', 'following', 10, 20),
('Networker', 'Get 10 followers', '🤝', 'social', 'followers', 10, 30),
('Influencer', 'Get 100 followers', '⭐', 'social', 'followers', 100, 200),
('Celebrity', 'Get 1000 followers', '👑', 'social', 'followers', 1000, 1000),
('Commentator', 'Leave 10 comments', '💬', 'engagement', 'comments', 10, 25),
('Bookworm', 'Bookmark 20 posts', '📚', 'engagement', 'bookmarks', 20, 30),
('Day 1', 'Login streak: 1 day', '🌱', 'streak', 'streak', 1, 5),
('Week Warrior', 'Login streak: 7 days', '🔥', 'streak', 'streak', 7, 50),
('Monthly Master', 'Login streak: 30 days', '💎', 'streak', 'streak', 30, 200),
('Verified', 'Get verified', '✅', 'special', 'verified', 1, 500),
('Referral King', 'Refer 5 users', '👥', 'special', 'referrals', 5, 150),
('Group Leader', 'Create a group', '🏠', 'social', 'groups_created', 1, 40),
('Poll Master', 'Create 5 polls', '📊', 'content', 'polls', 5, 60),
('Early Adopter', 'Join in the first month', '🚀', 'special', 'early_adopter', 1, 100);

CREATE OR REPLACE FUNCTION public.handle_new_user_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_points (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;