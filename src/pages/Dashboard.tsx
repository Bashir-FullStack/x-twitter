import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PostComposer from "@/components/feed/PostComposer";
import FeedPost from "@/components/feed/FeedPost";
import TrendingSidebar from "@/components/feed/TrendingSidebar";
import WhoToFollow from "@/components/feed/WhoToFollow";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";

export interface FeedPostData {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  user_id: string;
  likes_count: number;
  views_count: number;
  reposts_count: number;
  comments_count: number;
  category: string | null;
  tags: string[] | null;
  status: string;
  created_at: string;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    user_id: string;
  };
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"foryou" | "following">("foryou");

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tab === "following") {
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      const followingIds = followingData?.map((f) => f.following_id) || [];
      if (followingIds.length > 0) {
        query = query.in("user_id", followingIds);
      } else {
        setPosts([]);
        setLoading(false);
        return;
      }
    }

    const { data: postsData } = await query;
    if (!postsData?.length) { setPosts([]); setLoading(false); return; }

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const postIds = postsData.map((p) => p.id);

    const [profilesRes, likesRes, bookmarksRes, repostsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url, is_verified").in("user_id", userIds),
      supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      supabase.from("reposts").select("post_id").eq("user_id", user.id).in("post_id", postIds),
    ]);

    const likedSet = new Set(likesRes.data?.map((l) => l.post_id));
    const bookmarkedSet = new Set(bookmarksRes.data?.map((b) => b.post_id));
    const repostedSet = new Set(repostsRes.data?.map((r) => r.post_id));

    const feed: FeedPostData[] = postsData.map((p) => {
      const profile = profilesRes.data?.find((pr) => pr.user_id === p.user_id);
      return {
        ...p,
        tags: p.tags || [],
        profile: {
          display_name: profile?.display_name || "User",
          avatar_url: profile?.avatar_url,
          is_verified: profile?.is_verified || false,
          user_id: p.user_id,
        },
        liked: likedSet.has(p.id),
        bookmarked: bookmarkedSet.has(p.id),
        reposted: repostedSet.has(p.id),
      };
    });

    setPosts(feed);
    setLoading(false);
  }, [user, tab]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  return (
    <div className="flex justify-center">
      {/* Main Feed Column */}
      <div className="flex-1 min-w-0 max-w-[600px] border-x border-border">
        {/* Tabs header */}
        <div className="sticky top-0 lg:top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "foryou" | "following")}>
            <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none">
              <TabsTrigger
                value="foryou"
                className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground"
              >
                For you
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground"
              >
                Following
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Composer */}
        <PostComposer onPostCreated={loadFeed} />

        {/* Posts */}
        {loading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 w-36 bg-muted rounded" />
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-32 w-full bg-muted rounded-xl mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-8">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
            <p className="text-xl font-display font-bold">
              {tab === "following" ? "No posts from people you follow" : "Welcome to Platform!"}
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              {tab === "following" ? "Follow some people to see their posts here." : "Create your first post or explore trending topics."}
            </p>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <FeedPost key={post.id} post={post} onUpdate={loadFeed} />
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-[350px] shrink-0 space-y-4 py-3 px-6">
        <TrendingSidebar />
        <WhoToFollow />
        <div className="px-4 text-xs text-muted-foreground space-x-3 flex flex-wrap leading-6">
          <span className="hover:underline cursor-pointer">Terms</span>
          <span className="hover:underline cursor-pointer">Privacy</span>
          <span className="hover:underline cursor-pointer">Cookies</span>
          <span className="hover:underline cursor-pointer">About</span>
          <span className="hover:underline cursor-pointer">Ads</span>
          <span className="hover:underline cursor-pointer">Accessibility</span>
          <span>© 2026 Platform</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
