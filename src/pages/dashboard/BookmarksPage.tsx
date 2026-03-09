import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FeedPost from "@/components/feed/FeedPost";
import { Bookmark, ArrowLeft, MoreHorizontal, Folder, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { FeedPostData } from "@/pages/Dashboard";

const BookmarksPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "popular">("recent");

  const loadBookmarks = async () => {
    if (!user) return;
    setLoading(true);

    const { data: bookmarks } = await supabase.from("bookmarks").select("post_id, created_at").eq("user_id", user.id).order("created_at", { ascending: sortBy === "oldest" });
    if (!bookmarks?.length) { setPosts([]); setLoading(false); return; }

    const postIds = bookmarks.map((b) => b.post_id);
    let query = supabase.from("posts").select("*").in("id", postIds);
    if (sortBy === "popular") query = query.order("likes_count", { ascending: false });
    const { data: postsData } = await query;

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
        ...p, tags: p.tags || [],
        profile: { display_name: profile?.display_name || "User", avatar_url: profile?.avatar_url, is_verified: profile?.is_verified || false, user_id: p.user_id },
        liked: likedSet.has(p.id), bookmarked: true, reposted: repostedSet.has(p.id),
      };
    });

    // Maintain bookmark order if not sorting by popular
    if (sortBy !== "popular") {
      const orderMap = new Map(bookmarks.map((b, i) => [b.post_id, i]));
      feed.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
    }

    setPosts(feed);
    setLoading(false);
  };

  useEffect(() => { loadBookmarks(); }, [user, sortBy]);

  const clearAllBookmarks = async () => {
    if (!user) return;
    await supabase.from("bookmarks").delete().eq("user_id", user.id);
    setPosts([]);
    toast({ title: "All bookmarks cleared" });
  };

  const filteredPosts = searchQuery
    ? posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.body?.toLowerCase().includes(searchQuery.toLowerCase()))
    : posts;

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-[53px]">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
            <div>
              <h1 className="font-display font-bold text-xl">Bookmarks</h1>
              <p className="text-[13px] text-muted-foreground">{posts.length} saved</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><MoreHorizontal className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setSortBy("recent")} className="gap-2">Most recent</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")} className="gap-2">Oldest first</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("popular")} className="gap-2">Most popular</DropdownMenuItem>
              {posts.length > 0 && (
                <DropdownMenuItem onClick={clearAllBookmarks} className="text-destructive gap-2"><Trash2 className="h-4 w-4" /> Clear all bookmarks</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search bookmarks */}
        {posts.length > 0 && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search bookmarks" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-10" />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[1,2,3].map(i => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex gap-3"><div className="h-10 w-10 rounded-full bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-36 bg-muted rounded" /><div className="h-4 w-full bg-muted rounded" /></div></div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 px-8">
          <Bookmark className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl mb-1">{searchQuery ? "No results" : "Save posts for later"}</h2>
          <p className="text-[15px] text-muted-foreground max-w-xs mx-auto">
            {searchQuery ? `No bookmarks matching "${searchQuery}"` : "Bookmark posts to easily find them again in the future."}
          </p>
        </div>
      ) : (
        <div className="pb-16 lg:pb-0">
          {filteredPosts.map((post) => <FeedPost key={post.id} post={post} onUpdate={loadBookmarks} />)}
        </div>
      )}
    </div>
  );
};

export default BookmarksPage;
