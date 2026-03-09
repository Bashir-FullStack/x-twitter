import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BarChart3, TrendingUp, Eye, FileText, MessageSquare, Heart, Users, Repeat2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AnalyticsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ posts: 0, published: 0, messages: 0, totalViews: 0, totalLikes: 0, totalReposts: 0, followers: 0, following: 0 });
  const [topPosts, setTopPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      const [postsRes, publishedRes, messagesRes, followersRes, followingRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
      ]);
      const { data: postsData } = await supabase.from("posts").select("views_count, likes_count, reposts_count, title, id").eq("user_id", user.id).eq("status", "published").order("likes_count", { ascending: false }).limit(5);

      const totalViews = postsData?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
      const totalLikes = postsData?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;
      const totalReposts = postsData?.reduce((sum, p) => sum + (p.reposts_count || 0), 0) || 0;

      setStats({
        posts: postsRes.count || 0,
        published: publishedRes.count || 0,
        messages: messagesRes.count || 0,
        totalViews, totalLikes, totalReposts,
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
      });
      setTopPosts(postsData || []);
    };
    loadStats();
  }, [user]);

  const statCards = [
    { label: "Posts", value: stats.posts, icon: FileText, color: "text-primary" },
    { label: "Impressions", value: stats.totalViews, icon: Eye, color: "text-primary" },
    { label: "Likes", value: stats.totalLikes, icon: Heart, color: "text-destructive" },
    { label: "Reposts", value: stats.totalReposts, icon: Repeat2, color: "text-success" },
    { label: "Followers", value: stats.followers, icon: Users, color: "text-primary" },
    { label: "Following", value: stats.following, icon: Users, color: "text-muted-foreground" },
  ];

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-bold">Analytics</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-px bg-border">
        {statCards.map((card) => (
          <div key={card.label} className="bg-background p-5">
            <div className="flex items-center gap-2 mb-1">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-[13px] text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold font-display">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Engagement Rate */}
      <div className="border-b border-border p-5">
        <h2 className="font-display font-bold text-[17px] mb-4">Engagement Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-2xl bg-muted">
            <p className="text-2xl font-bold font-display text-primary">
              {stats.posts > 0 ? Math.round((stats.published / stats.posts) * 100) : 0}%
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">Publish Rate</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-muted">
            <p className="text-2xl font-bold font-display text-success">
              {stats.published > 0 ? Math.round(stats.totalViews / stats.published) : 0}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">Avg. Views</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-muted">
            <p className="text-2xl font-bold font-display text-destructive">
              {stats.published > 0 ? (stats.totalLikes / stats.published).toFixed(1) : 0}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">Avg. Likes</p>
          </div>
        </div>
      </div>

      {/* Top Posts */}
      <div className="p-5">
        <h2 className="font-display font-bold text-[17px] mb-3">Top Posts</h2>
        <div className="space-y-3">
          {topPosts.map((post, i) => (
            <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <span className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{post.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likes_count}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.views_count}</span>
                  <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" /> {post.reposts_count}</span>
                </div>
              </div>
            </div>
          ))}
          {topPosts.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No posts to analyze yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
