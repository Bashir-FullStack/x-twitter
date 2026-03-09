import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PostComposer from "@/components/feed/PostComposer";
import FeedPost from "@/components/feed/FeedPost";
import TrendingSidebar from "@/components/feed/TrendingSidebar";
import WhoToFollow from "@/components/feed/WhoToFollow";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"foryou" | "following" | "trending">("foryou");
  const [quotedPost, setQuotedPost] = useState<FeedPostData | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  const loadFeed = useCallback(async (pageNum = 0, append = false) => {
    if (!user) return;
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (tab === "following") {
      const { data: followingData } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      const followingIds = followingData?.map((f) => f.following_id) || [];
      if (followingIds.length > 0) {
        query = query.in("user_id", [...followingIds, user.id]);
      } else {
        setPosts([]); setLoading(false); setLoadingMore(false); return;
      }
    } else if (tab === "trending") {
      query = supabase.from("posts").select("*").eq("status", "published").order("likes_count", { ascending: false }).range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
    }

    const { data: postsData } = await query;
    if (!postsData?.length) { 
      if (!append) setPosts([]);
      setHasMore(false); setLoading(false); setLoadingMore(false); return; 
    }

    setHasMore(postsData.length === PAGE_SIZE);

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
        ...p, tags: p.tags || [],
        profile: { display_name: profile?.display_name || "User", avatar_url: profile?.avatar_url, is_verified: profile?.is_verified || false, user_id: p.user_id },
        liked: likedSet.has(p.id), bookmarked: bookmarkedSet.has(p.id), reposted: repostedSet.has(p.id),
      };
    });

    if (append) setPosts(prev => [...prev, ...feed]);
    else setPosts(feed);
    setLoading(false);
    setLoadingMore(false);
  }, [user, tab]);

  useEffect(() => { setPage(0); setHasMore(true); loadFeed(0); }, [loadFeed]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadFeed(nextPage, true);
      }
    }, { threshold: 0.5 });
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, loadFeed]);

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Real-time new post indicator
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("feed-realtime").on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
      if ((payload.new as any).user_id !== user.id && (payload.new as any).status === "published") {
        setNewPostsAvailable(true);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setNewPostsAvailable(false);
    setPage(0);
    setHasMore(true);
    await loadFeed(0);
    setRefreshing(false);
  };

  const handleQuote = (post: FeedPostData) => {
    setQuotedPost(post);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="flex justify-center">
      <div className="flex-1 min-w-0 max-w-[600px] border-x border-border">
        {/* Tabs */}
        <div className="sticky top-0 lg:top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none">
              {[
                { value: "foryou", label: "For you" },
                { value: "following", label: "Following" },
                { value: "trending", label: "Trending" },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value} className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* New posts banner */}
        {newPostsAvailable && (
          <button onClick={handleRefresh} className="w-full py-3 text-sm text-primary bg-primary/5 hover:bg-primary/10 transition-colors font-medium border-b border-border">
            Show new posts
          </button>
        )}

        <PostComposer
          onPostCreated={() => { setPage(0); loadFeed(0); }}
          quotedPost={quotedPost ? { id: quotedPost.id, body: quotedPost.body || quotedPost.title, profile: quotedPost.profile } : null}
          onClearQuote={() => setQuotedPost(null)}
        />

        <div className="flex justify-center py-2 border-b border-border">
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-primary text-sm rounded-full gap-2" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh feed"}
          </Button>
        </div>

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
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-8">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
            <p className="text-xl font-display font-bold">
              {tab === "following" ? "No posts from people you follow" : tab === "trending" ? "No trending posts yet" : "Welcome to Platform!"}
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              {tab === "following" ? "Follow some people to see their posts here." : "Create your first post or explore trending topics."}
            </p>
          </div>
        ) : (
          <div className="pb-16 lg:pb-0">
            {posts.map((post) => (
              <FeedPost key={post.id} post={post} onUpdate={() => loadFeed(0)} onQuote={handleQuote} />
            ))}
            {/* Infinite scroll sentinel */}
            <div ref={observerRef} className="h-10" />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                You've reached the end — you're all caught up!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-[350px] shrink-0 space-y-4 py-3 px-6">
        <TrendingSidebar />
        <WhoToFollow />
        <div className="px-4 text-xs text-muted-foreground space-x-3 flex flex-wrap leading-6">
          <a href="/dashboard/terms" className="hover:underline cursor-pointer">Terms</a>
          <a href="/dashboard/privacy" className="hover:underline cursor-pointer">Privacy</a>
          <span className="hover:underline cursor-pointer">Cookies</span>
          <a href="/dashboard/help" className="hover:underline cursor-pointer">Help</a>
          <span className="hover:underline cursor-pointer">Accessibility</span>
          <span>© 2026 Platform</span>
        </div>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button onClick={scrollToTop} className="fixed bottom-20 right-6 lg:bottom-8 h-12 w-12 rounded-full gradient-primary text-primary-foreground shadow-glow flex items-center justify-center z-40 hover:opacity-90 transition-opacity">
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default Dashboard;
