import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PostComposer from "@/components/feed/PostComposer";
import FeedPost from "@/components/feed/FeedPost";
import TrendingSidebar from "@/components/feed/TrendingSidebar";
import WhoToFollow from "@/components/feed/WhoToFollow";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="flex gap-6 max-w-[1200px] mx-auto animate-fade-in">
      {/* Main Feed */}
      <div className="flex-1 min-w-0">
        {/* Tabs */}
        <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-md border-b border-border -mx-4 lg:-mx-6 px-4 lg:px-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "foryou" | "following")}>
            <TabsList className="w-full bg-transparent h-12 p-0 gap-0">
              <TabsTrigger
                value="foryou"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold"
              >
                For you
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold"
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
          <div className="space-y-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-border p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-display font-semibold">No posts yet</p>
            <p className="text-sm mt-1">
              {tab === "following" ? "Follow some users to see their posts here" : "Be the first to post something!"}
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
      <div className="hidden lg:block w-80 shrink-0 space-y-4 py-4">
        <TrendingSidebar />
        <WhoToFollow />
      </div>
    </div>
  );
};

export default Dashboard;
