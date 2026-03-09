import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";
import InlineComments from "@/components/feed/InlineComments";
import { Heart, MessageCircle, Repeat2, Bookmark, Share, MoreHorizontal, Trash2, Pin, BarChart3, Flag, UserPlus, UserMinus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FeedPostData } from "@/pages/Dashboard";

interface FeedPostProps {
  post: FeedPostData;
  onUpdate: () => void;
}

const FeedPost = ({ post, onUpdate }: FeedPostProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [reposted, setReposted] = useState(post.reposted);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showFullText, setShowFullText] = useState(false);

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    const newCount = newLiked ? likesCount + 1 : likesCount - 1;
    setLiked(newLiked);
    setLikesCount(newCount);
    if (newLiked) {
      await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
    } else {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id);
    }
    await supabase.from("posts").update({ likes_count: newCount }).eq("id", post.id);
  };

  const toggleBookmark = async () => {
    if (!user) return;
    if (bookmarked) {
      setBookmarked(false);
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", post.id);
      toast({ title: "Removed from Bookmarks" });
    } else {
      setBookmarked(true);
      await supabase.from("bookmarks").insert({ user_id: user.id, post_id: post.id });
      toast({ title: "Added to Bookmarks" });
    }
  };

  const toggleRepost = async () => {
    if (!user) return;
    const newReposted = !reposted;
    const newCount = newReposted ? repostsCount + 1 : repostsCount - 1;
    setReposted(newReposted);
    setRepostsCount(newCount);
    if (newReposted) {
      await supabase.from("reposts").insert({ user_id: user.id, post_id: post.id });
    } else {
      await supabase.from("reposts").delete().eq("user_id", user.id).eq("post_id", post.id);
    }
    await supabase.from("posts").update({ reposts_count: newCount }).eq("id", post.id);
  };

  const deletePost = async () => {
    await supabase.from("posts").delete().eq("id", post.id);
    toast({ title: "Post deleted" });
    onUpdate();
  };

  const reportPost = async () => {
    if (!user) return;
    await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_post_id: post.id,
      reason: "Reported via post menu",
    });
    toast({ title: "Post reported" });
  };

  const sharePost = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast({ title: "Link copied to clipboard" });
  };

  const renderBody = (text: string) => {
    const parts = text.split(/(#\w+|@\w+|https?:\/\/\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        return <span key={i} className="text-primary hover:underline cursor-pointer">{part}</span>;
      }
      if (part.startsWith("@")) {
        return <span key={i} className="text-primary hover:underline cursor-pointer">{part}</span>;
      }
      if (part.startsWith("http")) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{part}</a>;
      }
      return part;
    });
  };

  const bodyText = post.body || post.title;
  const isLong = bodyText.length > 280;
  const displayText = isLong && !showFullText ? bodyText.slice(0, 280) + "..." : bodyText;

  return (
    <article className="border-b border-border hover:bg-muted/20 transition-colors">
      <div className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <div
            className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary cursor-pointer hover:opacity-80"
            onClick={() => navigate(`/dashboard/user/${post.profile.user_id}`)}
          >
            {post.profile.display_name?.[0]?.toUpperCase() || "U"}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <span
                  className="font-bold text-[15px] truncate hover:underline cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/user/${post.profile.user_id}`); }}
                >
                  {post.profile.display_name}
                </span>
                {post.profile.is_verified && <VerifiedBadge className="h-[18px] w-[18px] shrink-0" />}
                <span className="text-muted-foreground text-[15px]">·</span>
                <span className="text-muted-foreground text-[15px] shrink-0 hover:underline cursor-pointer">{timeAgo(post.created_at)}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:text-primary p-2 -m-2 rounded-full hover:bg-primary/10 transition-colors">
                  <MoreHorizontal className="h-[18px] w-[18px]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user?.id === post.user_id ? (
                    <>
                      <DropdownMenuItem onClick={deletePost} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: "Pin feature coming soon" })}>
                        <Pin className="h-4 w-4 mr-2" /> Pin to profile
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={reportPost}>
                        <Flag className="h-4 w-4 mr-2" /> Report post
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={sharePost}>
                    <Share className="h-4 w-4 mr-2" /> Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { toggleBookmark(); }}>
                    <Bookmark className="h-4 w-4 mr-2" /> {bookmarked ? "Remove bookmark" : "Bookmark"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            <div className="mt-0.5 text-[15px] leading-[20px] whitespace-pre-wrap break-words">
              {renderBody(displayText)}
              {isLong && !showFullText && (
                <button onClick={() => setShowFullText(true)} className="text-primary hover:underline text-sm ml-1">
                  Show more
                </button>
              )}
            </div>

            {/* Image */}
            {post.image_url && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-border">
                <img src={post.image_url} alt="" className="w-full max-h-[510px] object-cover" loading="lazy" />
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-primary text-xs cursor-pointer hover:underline">#{tag}</span>
                ))}
              </div>
            )}

            {/* Actions bar */}
            <div className="flex items-center justify-between mt-3 -ml-2">
              {/* Comment */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary group"
              >
                <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                  <MessageCircle className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px] min-w-[20px]">{commentsCount || ""}</span>
              </button>

              {/* Repost */}
              <button
                onClick={toggleRepost}
                className={`flex items-center gap-1 group ${reposted ? "text-accent" : "text-muted-foreground hover:text-accent"}`}
              >
                <div className="p-2 rounded-full group-hover:bg-accent/10 transition-colors">
                  <Repeat2 className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px] min-w-[20px]">{repostsCount || ""}</span>
              </button>

              {/* Like */}
              <button
                onClick={toggleLike}
                className={`flex items-center gap-1 group ${liked ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
              >
                <div className="p-2 rounded-full group-hover:bg-destructive/10 transition-colors">
                  <Heart className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} />
                </div>
                <span className="text-[13px] min-w-[20px]">{likesCount || ""}</span>
              </button>

              {/* Views */}
              <button className="flex items-center gap-1 text-muted-foreground hover:text-primary group">
                <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                  <BarChart3 className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px]">{post.views_count || ""}</span>
              </button>

              {/* Bookmark + Share */}
              <div className="flex items-center">
                <button
                  onClick={toggleBookmark}
                  className={`group ${bookmarked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                >
                  <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                    <Bookmark className={`h-[18px] w-[18px] ${bookmarked ? "fill-current" : ""}`} />
                  </div>
                </button>
                <button onClick={sharePost} className="text-muted-foreground hover:text-primary group">
                  <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                    <Share className="h-[18px] w-[18px]" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Comments */}
      {showComments && (
        <InlineComments
          postId={post.id}
          postAuthorId={post.user_id}
          onCommentCountChange={(count) => setCommentsCount(count)}
        />
      )}
    </article>
  );
};

export default FeedPost;
