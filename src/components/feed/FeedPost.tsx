import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";
import UserAvatar from "@/components/UserAvatar";
import InlineComments from "@/components/feed/InlineComments";
import { Heart, MessageCircle, Repeat2, Bookmark, Share, MoreHorizontal, Trash2, Pin, BarChart3, Flag, Quote, Edit, VolumeX, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { FeedPostData } from "@/pages/Dashboard";

interface FeedPostProps {
  post: FeedPostData;
  onUpdate: () => void;
  onQuote?: (post: FeedPostData) => void;
}

const FeedPost = ({ post, onUpdate, onQuote }: FeedPostProps) => {
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
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.body || post.title);
  const [editSaving, setEditSaving] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);

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
      setLikeAnimation(true);
      setTimeout(() => setLikeAnimation(false), 600);
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

  const editPost = async () => {
    if (!editContent.trim()) return;
    setEditSaving(true);
    const hashtags = editContent.match(/#\w+/g)?.map((h) => h.slice(1).toLowerCase()) || [];
    await supabase.from("posts").update({
      body: editContent,
      title: editContent.slice(0, 100),
      tags: hashtags,
    }).eq("id", post.id);
    setEditing(false);
    setEditSaving(false);
    toast({ title: "Post updated" });
    onUpdate();
  };

  const reportPost = async () => {
    if (!user) return;
    await supabase.from("reports").insert({ reporter_id: user.id, reported_post_id: post.id, reason: "Reported via post menu" });
    toast({ title: "Post reported" });
  };

  const sharePost = async () => {
    const url = `${window.location.origin}/dashboard`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.body || post.title, url });
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const renderBody = (text: string) => {
    const parts = text.split(/(#\w+|@\w+|https?:\/\/\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) return <span key={i} className="text-primary hover:underline cursor-pointer">{part}</span>;
      if (part.startsWith("@")) return <span key={i} className="text-primary hover:underline cursor-pointer">{part}</span>;
      if (part.startsWith("http")) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{part}</a>;
      return part;
    });
  };

  const bodyText = post.body || post.title;
  const isLong = bodyText.length > 280;
  const displayText = isLong && !showFullText ? bodyText.slice(0, 280) + "..." : bodyText;

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  return (
    <article className="border-b border-border hover:bg-muted/20 transition-colors">
      <div className="p-4">
        {/* Repost indicator */}
        {post.category === "quote" && (
          <div className="flex items-center gap-2 text-muted-foreground text-[13px] mb-2 ml-12">
            <Repeat2 className="h-4 w-4" />
            <span>Quote Post</span>
          </div>
        )}
        
        <div className="flex gap-3">
          <UserAvatar
            avatarUrl={post.profile.avatar_url}
            displayName={post.profile.display_name}
            className="h-10 w-10 shrink-0"
            onClick={() => navigate(`/dashboard/user/${post.profile.user_id}`)}
          />

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
                <span className="text-muted-foreground text-[15px] shrink-0">{timeAgo(post.created_at)}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:text-primary p-2 -m-2 rounded-full hover:bg-primary/10 transition-colors">
                  <MoreHorizontal className="h-[18px] w-[18px]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user?.id === post.user_id ? (
                    <>
                      <DropdownMenuItem onClick={() => { setEditContent(bodyText); setEditing(true); }}>
                        <Edit className="h-4 w-4 mr-2" /> Edit post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={deletePost} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: "Pinned to profile" })}>
                        <Pin className="h-4 w-4 mr-2" /> Pin to profile
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={reportPost}>
                        <Flag className="h-4 w-4 mr-2" /> Report post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: "User muted" })}>
                        <VolumeX className="h-4 w-4 mr-2" /> Mute @{post.profile.display_name?.split(" ")[0]}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={sharePost}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Share post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleBookmark}>
                    <Bookmark className="h-4 w-4 mr-2" /> {bookmarked ? "Remove bookmark" : "Bookmark"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            <div className="mt-0.5 text-[15px] leading-[20px] whitespace-pre-wrap break-words">
              {renderBody(displayText)}
              {isLong && !showFullText && (
                <button onClick={() => setShowFullText(true)} className="text-primary hover:underline text-sm ml-1">Show more</button>
              )}
            </div>

            {/* Image with lightbox potential */}
            {post.image_url && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-border cursor-pointer" onClick={() => window.open(post.image_url!, '_blank')}>
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
              <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 text-muted-foreground hover:text-primary group">
                <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                  <MessageCircle className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px] min-w-[20px]">{commentsCount || ""}</span>
              </button>

              {/* Repost dropdown with quote option */}
              <DropdownMenu>
                <DropdownMenuTrigger className={`flex items-center gap-1 group ${reposted ? "text-accent" : "text-muted-foreground hover:text-accent"}`}>
                  <div className="p-2 rounded-full group-hover:bg-accent/10 transition-colors">
                    <Repeat2 className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[13px] min-w-[20px]">{repostsCount || ""}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={toggleRepost}>
                    <Repeat2 className="h-4 w-4 mr-2" /> {reposted ? "Undo repost" : "Repost"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onQuote?.(post)}>
                    <Quote className="h-4 w-4 mr-2" /> Quote
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button onClick={toggleLike} className={`flex items-center gap-1 group ${liked ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
                <div className={`p-2 rounded-full group-hover:bg-destructive/10 transition-colors ${likeAnimation ? "animate-bounce" : ""}`}>
                  <Heart className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} />
                </div>
                <span className="text-[13px] min-w-[20px]">{likesCount ? formatNumber(likesCount) : ""}</span>
              </button>

              <button onClick={() => setShowStats(!showStats)} className="flex items-center gap-1 text-muted-foreground hover:text-primary group">
                <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                  <BarChart3 className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px]">{post.views_count ? formatNumber(post.views_count) : ""}</span>
              </button>

              <div className="flex items-center">
                <button onClick={toggleBookmark} className={`group ${bookmarked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
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

            {/* Engagement stats popup */}
            {showStats && (
              <div className="mt-2 p-3 bg-muted/50 rounded-xl border border-border text-sm grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="font-bold">{formatNumber(post.views_count)}</p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
                <div>
                  <p className="font-bold">{formatNumber(likesCount)}</p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
                <div>
                  <p className="font-bold">{formatNumber(repostsCount)}</p>
                  <p className="text-xs text-muted-foreground">Reposts</p>
                </div>
                <div>
                  <p className="font-bold">{formatNumber(commentsCount)}</p>
                  <p className="text-xs text-muted-foreground">Replies</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showComments && (
        <InlineComments postId={post.id} postAuthorId={post.user_id} onCommentCountChange={(count) => setCommentsCount(count)} />
      )}

      {/* Edit Post Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-display">Edit post</DialogTitle>
          </DialogHeader>
          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} className="resize-none" maxLength={500} />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{editContent.length}/500</span>
            <Button onClick={editPost} disabled={editSaving || !editContent.trim()} className="rounded-full gradient-primary text-primary-foreground font-bold">
              {editSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
};

export default FeedPost;
