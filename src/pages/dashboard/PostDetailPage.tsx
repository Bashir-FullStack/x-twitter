import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FeedPost from "@/components/feed/FeedPost";
import InlineComments from "@/components/feed/InlineComments";
import { ArrowLeft, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { FeedPostData } from "@/pages/Dashboard";

const PostDetailPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<FeedPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<FeedPostData[]>([]);

  useEffect(() => {
    if (!postId) return;
    loadPost();
  }, [postId, user]);

  const loadPost = async () => {
    if (!postId) return;
    setLoading(true);

    const { data: postData } = await supabase.from("posts").select("*").eq("id", postId).single();
    if (!postData) { setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("user_id, display_name, avatar_url, is_verified").eq("user_id", postData.user_id).single();

    let liked = false, bookmarked = false, reposted = false;
    if (user) {
      const [l, b, r] = await Promise.all([
        supabase.from("likes").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
        supabase.from("bookmarks").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
        supabase.from("reposts").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
      ]);
      liked = !!l.data;
      bookmarked = !!b.data;
      reposted = !!r.data;
    }

    setPost({
      ...postData,
      tags: postData.tags || [],
      profile: {
        display_name: profile?.display_name || "User",
        avatar_url: profile?.avatar_url,
        is_verified: profile?.is_verified || false,
        user_id: postData.user_id,
      },
      liked, bookmarked, reposted,
    });

    // Load related posts by same user
    const { data: related } = await supabase.from("posts").select("*").eq("user_id", postData.user_id).eq("status", "published").neq("id", postId).order("created_at", { ascending: false }).limit(3);
    if (related?.length && profile) {
      setRelatedPosts(related.map(p => ({
        ...p, tags: p.tags || [],
        profile: { display_name: profile.display_name || "User", avatar_url: profile.avatar_url, is_verified: profile.is_verified || false, user_id: p.user_id },
        liked: false, bookmarked: false, reposted: false,
      })));
    }

    setLoading(false);
  };

  const sharePost = () => {
    const url = `${window.location.origin}/dashboard/post/${postId}`;
    if (navigator.share) {
      navigator.share({ title: post?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
        <div className="h-[53px] border-b border-border flex items-center gap-6 px-4">
          <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-xl font-bold">Post</h1>
        </div>
        <div className="p-4 animate-pulse space-y-3">
          <div className="flex gap-3"><div className="h-10 w-10 rounded-full bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-36 bg-muted rounded" /><div className="h-4 w-full bg-muted rounded" /></div></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0 flex flex-col items-center justify-center">
        <p className="text-muted-foreground text-lg font-display font-bold">Post not found</p>
        <Button variant="link" onClick={() => navigate("/dashboard")}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-xl font-bold">Post</h1>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={sharePost}><Share className="h-5 w-5" /></Button>
      </div>

      <FeedPost post={post} onUpdate={loadPost} />

      {/* Full comments thread */}
      <div className="border-b border-border">
        <InlineComments postId={post.id} postAuthorId={post.user_id} onCommentCountChange={() => {}} />
      </div>

      {/* Detailed stats */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-6 text-[15px]">
          <span><strong>{post.reposts_count}</strong> <span className="text-muted-foreground">Reposts</span></span>
          <span><strong>{post.likes_count}</strong> <span className="text-muted-foreground">Likes</span></span>
          <span><strong>{post.views_count}</strong> <span className="text-muted-foreground">Views</span></span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="px-4 py-3 border-b border-border text-[15px] text-muted-foreground">
        {new Date(post.created_at).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric", year: "numeric" })}
      </div>

      {/* More posts from this user */}
      {relatedPosts.length > 0 && (
        <div>
          <h3 className="px-4 pt-4 pb-2 font-display font-bold text-[17px]">More from {post.profile.display_name}</h3>
          {relatedPosts.map(p => <FeedPost key={p.id} post={p} onUpdate={loadPost} />)}
        </div>
      )}
    </div>
  );
};

export default PostDetailPage;
