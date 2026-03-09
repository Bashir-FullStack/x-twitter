import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";
import CommentsSheet from "@/components/feed/CommentsSheet";
import { Heart, MessageCircle, Repeat2, Bookmark, Share, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FeedPostData } from "@/pages/Dashboard";

interface FeedPostProps {
  post: FeedPostData;
  onUpdate: () => void;
}

const FeedPost = ({ post, onUpdate }: FeedPostProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [reposted, setReposted] = useState(post.reposted);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      setLiked(false); setLikesCount((c) => c - 1);
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id);
      await supabase.from("posts").update({ likes_count: likesCount - 1 }).eq("id", post.id);
    } else {
      setLiked(true); setLikesCount((c) => c + 1);
      await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
      await supabase.from("posts").update({ likes_count: likesCount + 1 }).eq("id", post.id);
    }
  };

  const toggleBookmark = async () => {
    if (!user) return;
    if (bookmarked) {
      setBookmarked(false);
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", post.id);
    } else {
      setBookmarked(true);
      await supabase.from("bookmarks").insert({ user_id: user.id, post_id: post.id });
      toast({ title: "Added to Bookmarks" });
    }
  };

  const toggleRepost = async () => {
    if (!user) return;
    if (reposted) {
      setReposted(false); setRepostsCount((c) => c - 1);
      await supabase.from("reposts").delete().eq("user_id", user.id).eq("post_id", post.id);
      await supabase.from("posts").update({ reposts_count: repostsCount - 1 }).eq("id", post.id);
    } else {
      setReposted(true); setRepostsCount((c) => c + 1);
      await supabase.from("reposts").insert({ user_id: user.id, post_id: post.id });
      await supabase.from("posts").update({ reposts_count: repostsCount + 1 }).eq("id", post.id);
    }
  };

  const deletePost = async () => {
    await supabase.from("posts").delete().eq("id", post.id);
    toast({ title: "Post deleted" });
    onUpdate();
  };

  const sharePost = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast({ title: "Link copied to clipboard" });
  };

  // Render body with clickable hashtags
  const renderBody = (text: string) => {
    return text.split(/(#\w+)/g).map((part, i) => {
      if (part.startsWith("#")) {
        return <span key={i} className="text-primary hover:underline cursor-pointer">{part}</span>;
      }
      return part;
    });
  };

  return (
    <>
      <article className="border-b border-border p-4 hover:bg-muted/30 transition-colors cursor-pointer">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            {post.profile.display_name?.[0]?.toUpperCase() || "U"}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-semibold text-sm truncate">{post.profile.display_name}</span>
                {post.profile.is_verified && <VerifiedBadge className="h-4 w-4 shrink-0" />}
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-muted-foreground text-sm shrink-0">{timeAgo(post.created_at)}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-primary/10">
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user?.id === post.user_id && (
                    <DropdownMenuItem onClick={deletePost} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={sharePost}>
                    <Share className="h-4 w-4 mr-2" /> Copy link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {post.body ? renderBody(post.body) : post.title}
            </div>

            {/* Image */}
            {post.image_url && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-border">
                <img src={post.image_url} alt="" className="w-full max-h-[500px] object-cover" />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 max-w-md -ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); setCommentsOpen(true); }}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary group"
              >
                <div className="p-1.5 rounded-full group-hover:bg-primary/10 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <span className="text-xs">{post.comments_count || ""}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); toggleRepost(); }}
                className={`flex items-center gap-1.5 group ${reposted ? "text-accent" : "text-muted-foreground hover:text-accent"}`}
              >
                <div className="p-1.5 rounded-full group-hover:bg-accent/10 transition-colors">
                  <Repeat2 className="h-4 w-4" />
                </div>
                <span className="text-xs">{repostsCount || ""}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(); }}
                className={`flex items-center gap-1.5 group ${liked ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
              >
                <div className="p-1.5 rounded-full group-hover:bg-destructive/10 transition-colors">
                  <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                </div>
                <span className="text-xs">{likesCount || ""}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                className={`flex items-center gap-1.5 group ${bookmarked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
              >
                <div className="p-1.5 rounded-full group-hover:bg-primary/10 transition-colors">
                  <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
                </div>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); sharePost(); }}
                className="text-muted-foreground hover:text-primary group"
              >
                <div className="p-1.5 rounded-full group-hover:bg-primary/10 transition-colors">
                  <Share className="h-4 w-4" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </article>

      <CommentsSheet
        postId={post.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        onCommentAdded={onUpdate}
      />
    </>
  );
};

export default FeedPost;
