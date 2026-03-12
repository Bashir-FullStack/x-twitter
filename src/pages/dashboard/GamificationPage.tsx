import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, Flame, Star, Zap, Crown, Target, Gift, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
}

interface UserPoints {
  points: number;
  level: number;
  streak_days: number;
  last_streak_date: string | null;
  total_earned: number;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  points: number;
  level: number;
}

const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 800, 1200, 1700, 2400, 3200, 4200, 5500, 7000];
const RANK_NAMES = ["Newbie", "Rookie", "Explorer", "Contributor", "Active", "Rising Star", "Veteran", "Expert", "Master", "Champion", "Legend", "Immortal", "Mythic"];

const GamificationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userPoints, setUserPoints] = useState<UserPoints>({ points: 0, level: 1, streak_days: 0, last_streak_date: null, total_earned: 0 });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<Set<string>>(new Set());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState({ posts: 0, likes: 0, followers: 0, following: 0, comments: 0, bookmarks: 0 });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [pointsRes, achievementsRes, earnedRes, postsCount, likesCount, followersCount, followingCount, commentsCount, bookmarksCount, leaderboardRes] = await Promise.all([
      supabase.from("user_points").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("achievements").select("*").order("points_reward"),
      supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
      supabase.from("likes").select("id", { count: "exact", head: true }).in("post_id", (await supabase.from("posts").select("id").eq("user_id", user.id)).data?.map(p => p.id) || []),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("user_points").select("user_id, points, level").order("points", { ascending: false }).limit(20),
    ]);

    if (pointsRes.data) {
      setUserPoints(pointsRes.data as UserPoints);
    } else {
      // Create points record
      await supabase.from("user_points").insert({ user_id: user.id });
    }

    setAchievements((achievementsRes.data as Achievement[]) || []);
    setEarnedAchievements(new Set(earnedRes.data?.map(e => e.achievement_id) || []));
    setUserStats({
      posts: postsCount.count || 0,
      likes: likesCount.count || 0,
      followers: followersCount.count || 0,
      following: followingCount.count || 0,
      comments: commentsCount.count || 0,
      bookmarks: bookmarksCount.count || 0,
    });

    // Build leaderboard
    if (leaderboardRes.data?.length) {
      const userIds = leaderboardRes.data.map(l => l.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, is_verified").in("user_id", userIds);
      setLeaderboard(leaderboardRes.data.map(l => {
        const p = profiles?.find(pr => pr.user_id === l.user_id);
        return { ...l, display_name: p?.display_name || "User", avatar_url: p?.avatar_url || null, is_verified: p?.is_verified || false };
      }));
    }

    // Update streak
    await updateStreak();

    setLoading(false);
  };

  const updateStreak = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    if (userPoints.last_streak_date === today) return;
    
    let newStreak = 1;
    if (userPoints.last_streak_date === yesterday) {
      newStreak = userPoints.streak_days + 1;
    }
    
    await supabase.from("user_points").update({ 
      streak_days: newStreak, 
      last_streak_date: today,
      points: userPoints.points + (newStreak > 1 ? 5 : 2),
      total_earned: userPoints.total_earned + (newStreak > 1 ? 5 : 2),
    }).eq("user_id", user.id);
    
    setUserPoints(prev => ({ ...prev, streak_days: newStreak, last_streak_date: today }));
  };

  const checkAndClaimAchievement = async (achievement: Achievement) => {
    if (!user || earnedAchievements.has(achievement.id)) return;
    
    let progress = getProgress(achievement);
    if (progress < achievement.requirement_value) {
      toast({ title: "Not yet!", description: `Progress: ${progress}/${achievement.requirement_value}`, variant: "destructive" });
      return;
    }

    setClaiming(true);
    const { error } = await supabase.from("user_achievements").insert({ user_id: user.id, achievement_id: achievement.id });
    if (!error) {
      await supabase.from("user_points").update({
        points: userPoints.points + achievement.points_reward,
        total_earned: userPoints.total_earned + achievement.points_reward,
      }).eq("user_id", user.id);
      setEarnedAchievements(prev => new Set(prev).add(achievement.id));
      setUserPoints(prev => ({ ...prev, points: prev.points + achievement.points_reward, total_earned: prev.total_earned + achievement.points_reward }));
      toast({ title: `🏆 Achievement Unlocked: ${achievement.name}`, description: `+${achievement.points_reward} points!` });
    }
    setClaiming(false);
  };

  const getProgress = (a: Achievement) => {
    switch (a.requirement_type) {
      case "posts": return userStats.posts;
      case "likes_received": return userStats.likes;
      case "followers": return userStats.followers;
      case "following": return userStats.following;
      case "comments": return userStats.comments;
      case "bookmarks": return userStats.bookmarks;
      case "streak": return userPoints.streak_days;
      default: return 0;
    }
  };

  const currentLevelThreshold = LEVEL_THRESHOLDS[Math.min(userPoints.level - 1, LEVEL_THRESHOLDS.length - 1)] || 0;
  const nextLevelThreshold = LEVEL_THRESHOLDS[Math.min(userPoints.level, LEVEL_THRESHOLDS.length - 1)] || currentLevelThreshold + 500;
  const levelProgress = ((userPoints.points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100;

  // Auto-level up
  useEffect(() => {
    const newLevel = LEVEL_THRESHOLDS.findIndex(t => userPoints.points < t);
    const level = newLevel === -1 ? LEVEL_THRESHOLDS.length : newLevel;
    if (level !== userPoints.level && user) {
      supabase.from("user_points").update({ level }).eq("user_id", user.id);
      setUserPoints(prev => ({ ...prev, level }));
    }
  }, [userPoints.points]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const categories = [...new Set(achievements.map(a => a.category))];

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 lg:hidden"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Achievements</h1>
      </div>

      {/* Stats Hero */}
      <div className="p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-2xl font-bold text-primary-foreground">{userPoints.level}</span>
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-bold">{RANK_NAMES[Math.min(userPoints.level - 1, RANK_NAMES.length - 1)]}</p>
            <p className="text-sm text-muted-foreground">{userPoints.points.toLocaleString()} points</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-warning">
              <Flame className="h-5 w-5" />
              <span className="font-bold text-lg">{userPoints.streak_days}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">day streak</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Level {userPoints.level}</span>
            <span>Level {userPoints.level + 1}</span>
          </div>
          <Progress value={Math.min(levelProgress, 100)} className="h-2.5" />
          <p className="text-xs text-muted-foreground text-center">{nextLevelThreshold - userPoints.points} points to next level</p>
        </div>
      </div>

      <Tabs defaultValue="achievements">
        <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
          {["Achievements", "Leaderboard"].map(t => (
            <TabsTrigger key={t} value={t.toLowerCase()} className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="achievements" className="mt-0">
          {categories.map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-2">{cat}</h3>
              {achievements.filter(a => a.category === cat).map(a => {
                const earned = earnedAchievements.has(a.id);
                const progress = getProgress(a);
                const pct = Math.min((progress / a.requirement_value) * 100, 100);
                const canClaim = progress >= a.requirement_value && !earned;
                return (
                  <div key={a.id} className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 ${earned ? "opacity-80" : ""}`}>
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-xl ${earned ? "bg-primary/20" : "bg-muted"}`}>
                      {a.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${earned ? "line-through text-muted-foreground" : ""}`}>{a.name}</p>
                        {earned && <Award className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                      {!earned && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground">{progress}/{a.requirement_value}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {earned ? (
                        <span className="text-xs text-primary font-medium">✓ Earned</span>
                      ) : canClaim ? (
                        <Button size="sm" onClick={() => checkAndClaimAchievement(a)} disabled={claiming} className="rounded-full text-xs h-7 px-3 gradient-primary text-primary-foreground">
                          Claim +{a.points_reward}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">+{a.points_reward}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-0">
          {leaderboard.map((entry, i) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 ${entry.user_id === user?.id ? "bg-primary/5" : ""}`}
              onClick={() => navigate(`/dashboard/user/${entry.user_id}`)}
            >
              <span className={`font-display font-bold text-lg w-8 text-center ${i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-warning/60" : "text-muted-foreground/50"}`}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <UserAvatar avatarUrl={entry.avatar_url} displayName={entry.display_name} className="h-10 w-10" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{entry.display_name}</p>
                <p className="text-xs text-muted-foreground">Level {entry.level} · {RANK_NAMES[Math.min(entry.level - 1, RANK_NAMES.length - 1)]}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-primary">{entry.points.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">points</p>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No leaderboard data yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GamificationPage;
