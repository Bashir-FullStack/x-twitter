import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FeedPost from "@/components/feed/FeedPost";
import { Bookmark } from "lucide-react";
import type { FeedPostData } from "@/pages/Dashboard";

const BookmarksPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = async () => {
    if (!user) return;
    setLoading(true);

    const { data: bookmarks } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!bookmarks?.length) { setPosts([]); setLoading(false); return; }

    const postIds = bookmarks.map((b) => b.post_id);
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .in("id", postIds);

    if (!postsData?.length) { setPosts([]); setLoading(false); return; }

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const [profilesRes, likesRes, repostsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url, is_verified").in("user_id", userIds),
      supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      supabase.from("reposts").select("post_id").eq("user_id", user.id).in("post_id", postIds),
    ]);

    const likedSet = new Set(likesRes.data?.map((l) => l.post_id));
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
        bookmarked: true,
        reposted: repostedSet.has(p.id),
      };
    });

    setPosts(feed);
    setLoading(false);
  };

  useEffect(() => { loadBookmarks(); }, [user]);

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold p-4 border-b border-border">Bookmarks</h1>
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-display font-semibold text-lg">Save posts for later</p>
          <p className="text-sm text-muted-foreground mt-1">Bookmark posts to easily find them again.</p>
        </div>
      ) : (
        posts.map((post) => <FeedPost key={post.id} post={post} onUpdate={loadBookmarks} />)
      )}
    </div>
  );
};

export default BookmarksPage;
