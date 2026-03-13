import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge, { WhiteTickBadge } from "@/components/VerifiedBadge";
import UserAvatar from "@/components/UserAvatar";
import InlineComments from "@/components/feed/InlineComments";
import { Heart, MessageCircle, Repeat2, Bookmark, Share, MoreHorizontal, Trash2, Pin, BarChart3, Flag, Quote, Edit, VolumeX, ExternalLink, Shield, Eye, Copy, Link2, Play } from "lucide-react";
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
  const [isAuthorAdmin, setIsAuthorAdmin] = useState(false);
  const [viewIncremented, setViewIncremented] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const lastTapRef = useRef(0);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);

  // Sync state when post prop changes
  useEffect(() => {
    setLiked(post.liked);
    setLikesCount(post.likes_count);
    setBookmarked(post.bookmarked);
    setReposted(post.reposted);
    setRepostsCount(post.reposts_count);
    setCommentsCount(post.comments_count);
  }, [post.id, post.liked, post.bookmarked, post.reposted, post.likes_count, post.reposts_count, post.comments_count]);

  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", post.user_id).in("role", ["admin", "super_admin"]).then(({ data }) => {
      setIsAuthorAdmin((data?.length || 0) > 0);
    });
  }, [post.user_id]);

  useEffect(() => {
    if (!viewIncremented && user) {
      setViewIncremented(true);
      supabase.from("posts").update({ views_count: (post.views_count || 0) + 1 }).eq("id", post.id);
    }
  }, [post.id]);

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
      if (post.user_id !== user.id) {
        await supabase.from("notifications").insert({ user_id: post.user_id, title: `${user.email?.split("@")[0]} liked your post`, body: post.title?.slice(0, 80), type: "like", link: `/dashboard/post/${post.id}` });
      }
    } else {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id);
    }
    await supabase.from("posts").update({ likes_count: newCount }).eq("id", post.id);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        toggleLike();
        setDoubleTapHeart(true);
        setTimeout(() => setDoubleTapHeart(false), 1000);
      }
    }
    lastTapRef.current = now;
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
    try {
      if (reposted) {
        // Undo repost
        const { error } = await supabase.from("reposts").delete().eq("user_id", user.id).eq("post_id", post.id);
        if (error) throw error;
        const newCount = Math.max(0, repostsCount - 1);
        setReposted(false);
        setRepostsCount(newCount);
        await supabase.from("posts").update({ reposts_count: newCount }).eq("id", post.id);
        toast({ title: "Repost removed" });
      } else {
        // Check if already reposted (avoid duplicate)
        const { data: existing } = await supabase.from("reposts").select("id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle();
        if (existing) {
          setReposted(true);
          toast({ title: "Already reposted" });
          return;
        }
        const { error } = await supabase.from("reposts").insert({ user_id: user.id, post_id: post.id });
        if (error) throw error;
        const newCount = repostsCount + 1;
        setReposted(true);
        setRepostsCount(newCount);
        await supabase.from("posts").update({ reposts_count: newCount }).eq("id", post.id);
        if (post.user_id !== user.id) {
          await supabase.from("notifications").insert({ user_id: post.user_id, title: `${user.email?.split("@")[0]} reposted your post`, type: "repost", link: `/dashboard/post/${post.id}` });
        }
        toast({ title: "Reposted!" });
      }
    } catch (err: any) {
      toast({ title: "Repost failed", description: err.message, variant: "destructive" });
    }
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
    await supabase.from("posts").update({ body: editContent, title: editContent.slice(0, 100), tags: hashtags }).eq("id", post.id);
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
    const url = `${window.location.origin}/dashboard/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, text: post.body || post.title, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const copyPostText = () => {
    navigator.clipboard.writeText(post.body || post.title);
    toast({ title: "Text copied" });
  };

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

  const renderBody = (text: string) => {
    const parts = text.split(/(#\w+|@\w+|https?:\/\/\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) return <span key={i} className="text-primary hover:underline cursor-pointer">{part}</span>;
      if (part.startsWith("@")) return <span key={i} className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/search`); }}>{part}</span>;
      if (part.startsWith("http")) return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Link2 className="h-3 w-3 inline" />{part.replace(/https?:\/\//, "").slice(0, 30)}{part.length > 30 ? "..." : ""}
        </a>
      );
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
      <div className="p-4" onClick={handleDoubleTap}>
        {post.category === "quote" && (
          <div className="flex items-center gap-2 text-muted-foreground text-[13px] mb-2 ml-12">
            <Repeat2 className="h-4 w-4" /><span>Quote Post</span>
          </div>
        )}

        {doubleTapHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Heart className="h-20 w-20 text-destructive fill-current animate-ping" />
          </div>
        )}

        <div className="flex gap-3 relative">
          <UserAvatar avatarUrl={post.profile.avatar_url} displayName={post.profile.display_name} className="h-10 w-10 shrink-0" onClick={() => navigate(`/dashboard/user/${post.profile.user_id}`)} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-bold text-[15px] truncate hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/user/${post.profile.user_id}`); }}>
                  {post.profile.display_name}
                </span>
                {post.profile.is_verified && <VerifiedBadge className="h-[18px] w-[18px] shrink-0" />}
                {isAuthorAdmin && <Shield className="h-[14px] w-[14px] text-success shrink-0" />}
                <span className="text-muted-foreground text-[15px]">·</span>
                <span className="text-muted-foreground text-[15px] shrink-0 hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/post/${post.id}`); }}>
                  {timeAgo(post.created_at)}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:text-primary p-2 -m-2 rounded-full hover:bg-primary/10 transition-colors">
                  <MoreHorizontal className="h-[18px] w-[18px]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user?.id === post.user_id ? (
                    <>
                      <DropdownMenuItem onClick={() => { setEditContent(bodyText); setEditing(true); }}><Edit className="h-4 w-4 mr-2" /> Edit post</DropdownMenuItem>
                      <DropdownMenuItem onClick={deletePost} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete post</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: "Pinned to profile" })}><Pin className="h-4 w-4 mr-2" /> Pin to profile</DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={reportPost}><Flag className="h-4 w-4 mr-2" /> Report post</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: "User muted" })}><VolumeX className="h-4 w-4 mr-2" /> Mute @{post.profile.display_name?.split(" ")[0]}</DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={copyPostText}><Copy className="h-4 w-4 mr-2" /> Copy text</DropdownMenuItem>
                  <DropdownMenuItem onClick={sharePost}><ExternalLink className="h-4 w-4 mr-2" /> Share post</DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleBookmark}><Bookmark className="h-4 w-4 mr-2" /> {bookmarked ? "Remove bookmark" : "Bookmark"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/dashboard/post/${post.id}`)}><Eye className="h-4 w-4 mr-2" /> View post detail</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-0.5 text-[15px] leading-[20px] whitespace-pre-wrap break-words cursor-pointer" onClick={() => navigate(`/dashboard/post/${post.id}`)}>
              {renderBody(displayText)}
              {isLong && !showFullText && (
                <button onClick={(e) => { e.stopPropagation(); setShowFullText(true); }} className="text-primary hover:underline text-sm ml-1">Show more</button>
              )}
            </div>

            {/* Image or Video */}
            {post.image_url && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-border cursor-pointer relative" onClick={(e) => { e.stopPropagation(); setShowImageLightbox(true); }}>
                {isVideoUrl(post.image_url) ? (
                  <video src={post.image_url} controls className="w-full max-h-[510px] object-cover" preload="metadata" />
                ) : (
                  <img src={post.image_url} alt="" className="w-full max-h-[510px] object-cover" loading="lazy" />
                )}
              </div>
            )}

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
                <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors"><MessageCircle className="h-[18px] w-[18px]" /></div>
                <span className="text-[13px] min-w-[20px]">{commentsCount || ""}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className={`flex items-center gap-1 group ${reposted ? "text-accent" : "text-muted-foreground hover:text-accent"}`}>
                  <div className="p-2 rounded-full group-hover:bg-accent/10 transition-colors"><Repeat2 className="h-[18px] w-[18px]" /></div>
                  <span className="text-[13px] min-w-[20px]">{repostsCount || ""}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleRepost(); }}><Repeat2 className="h-4 w-4 mr-2" /> {reposted ? "Undo repost" : "Repost"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onQuote?.(post); }}><Quote className="h-4 w-4 mr-2" /> Quote</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button onClick={toggleLike} className={`flex items-center gap-1 group ${liked ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
                <div className={`p-2 rounded-full group-hover:bg-destructive/10 transition-colors ${likeAnimation ? "animate-bounce" : ""}`}>
                  <Heart className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} />
                </div>
                <span className="text-[13px] min-w-[20px]">{likesCount ? formatNumber(likesCount) : ""}</span>
              </button>

              <button onClick={() => setShowStats(!showStats)} className="flex items-center gap-1 text-muted-foreground hover:text-primary group">
                <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors"><BarChart3 className="h-[18px] w-[18px]" /></div>
                <span className="text-[13px]">{post.views_count ? formatNumber(post.views_count) : ""}</span>
              </button>

              <div className="flex items-center">
                <button onClick={toggleBookmark} className={`group ${bookmarked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                  <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                    <Bookmark className={`h-[18px] w-[18px] ${bookmarked ? "fill-current" : ""}`} />
                  </div>
                </button>
                <button onClick={sharePost} className="text-muted-foreground hover:text-primary group">
                  <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors"><Share className="h-[18px] w-[18px]" /></div>
                </button>
              </div>
            </div>

            {showStats && (
              <div className="mt-2 p-3 bg-muted/50 rounded-xl border border-border text-sm grid grid-cols-4 gap-3 text-center">
                <div><p className="font-bold">{formatNumber(post.views_count)}</p><p className="text-xs text-muted-foreground">Views</p></div>
                <div><p className="font-bold">{formatNumber(likesCount)}</p><p className="text-xs text-muted-foreground">Likes</p></div>
                <div><p className="font-bold">{formatNumber(repostsCount)}</p><p className="text-xs text-muted-foreground">Reposts</p></div>
                <div><p className="font-bold">{formatNumber(commentsCount)}</p><p className="text-xs text-muted-foreground">Replies</p></div>
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
          <DialogHeader><DialogTitle className="font-display">Edit post</DialogTitle></DialogHeader>
          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} className="resize-none" maxLength={500} />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{editContent.length}/500</span>
            <Button onClick={editPost} disabled={editSaving || !editContent.trim()} className="rounded-full gradient-primary text-primary-foreground font-bold">
              {editSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      {post.image_url && (
        <Dialog open={showImageLightbox} onOpenChange={setShowImageLightbox}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
            {isVideoUrl(post.image_url) ? (
              <video src={post.image_url} controls autoPlay className="w-full max-h-[90vh] object-contain" />
            ) : (
              <img src={post.image_url} alt="" className="w-full max-h-[90vh] object-contain" />
            )}
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
};

export default FeedPost;
