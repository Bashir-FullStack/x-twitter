import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import VerifiedBadge from "@/components/VerifiedBadge";
import UserAvatar from "@/components/UserAvatar";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  isAuthorReply: boolean;
  profile?: { display_name: string | null; is_verified: boolean; avatar_url: string | null };
}

interface InlineCommentsProps {
  postId: string;
  postAuthorId: string;
  onCommentCountChange: (count: number) => void;
}

const InlineComments = ({ postId, postAuthorId, onCommentCountChange }: InlineCommentsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);

  useEffect(() => {
    loadComments();
    if (user) {
      supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).single().then(({ data }) => setMyProfile(data));
    }
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    const { data } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, display_name, is_verified, avatar_url").in("user_id", userIds)
      : { data: [] };

    const mapped: Comment[] = data.map((c) => ({
      ...c,
      isAuthorReply: c.user_id === postAuthorId,
      profile: profiles?.find((p) => p.user_id === c.user_id) || { display_name: "User", is_verified: false, avatar_url: null },
    }));

    mapped.sort((a, b) => {
      if (a.isAuthorReply && !b.isAuthorReply) return -1;
      if (!a.isAuthorReply && b.isAuthorReply) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    setComments(mapped);
    onCommentCountChange(mapped.length);
    setLoading(false);
  };

  const addComment = async () => {
    if (!user || !newComment.trim()) return;
    setPosting(true);
    await supabase.from("comments").insert({ user_id: user.id, post_id: postId, content: newComment.trim() });
    setNewComment("");
    await loadComments();
    setPosting(false);
  };

  const deleteComment = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id);
    await loadComments();
    toast({ title: "Comment deleted" });
  };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const displayComments = showAll ? comments : comments.slice(0, 3);

  return (
    <div className="border-t border-border bg-muted/10">
      {/* Comment input */}
      <div className="flex gap-3 p-3 px-4 border-b border-border/50">
        <UserAvatar
          avatarUrl={myProfile?.avatar_url}
          displayName={myProfile?.display_name || user?.email}
          className="h-8 w-8 shrink-0"
        />
        <div className="flex-1 flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Post your reply"
            className="border-0 bg-transparent resize-none text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 p-0 min-h-[32px]"
            rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
          />
          <Button
            onClick={addComment}
            disabled={!newComment.trim() || posting}
            size="sm"
            className="rounded-full gradient-primary text-primary-foreground h-8 px-4 text-xs font-bold shrink-0 self-end"
          >
            Reply
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-center text-sm text-muted-foreground">Loading replies...</div>
      ) : (
        <div>
          {displayComments.map((c) => (
            <div
              key={c.id}
              className={`flex gap-3 p-3 px-4 border-b border-border/30 transition-colors ${
                c.isAuthorReply ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"
              }`}
            >
              <UserAvatar
                avatarUrl={c.profile?.avatar_url}
                displayName={c.profile?.display_name}
                className="h-8 w-8 shrink-0"
                onClick={() => navigate(`/dashboard/user/${c.user_id}`)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span
                    className={`font-bold text-[13px] hover:underline cursor-pointer ${c.isAuthorReply ? "text-primary" : ""}`}
                    onClick={() => navigate(`/dashboard/user/${c.user_id}`)}
                  >
                    {c.profile?.display_name || "User"}
                  </span>
                  {c.profile?.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                  {c.isAuthorReply && (
                    <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Author</span>
                  )}
                  <span className="text-xs text-muted-foreground">· {timeAgo(c.created_at)}</span>
                  {user?.id === c.user_id && (
                    <button onClick={() => deleteComment(c.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className={`text-[14px] mt-0.5 leading-[18px] ${c.isAuthorReply ? "font-medium" : ""}`}>{c.content}</p>
              </div>
            </div>
          ))}

          {comments.length > 3 && !showAll && (
            <button onClick={() => setShowAll(true)} className="w-full p-3 text-sm text-primary hover:bg-muted/30 transition-colors font-medium">
              Show {comments.length - 3} more replies
            </button>
          )}

          {comments.length === 0 && !loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">No replies yet — be the first to reply!</div>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineComments;
