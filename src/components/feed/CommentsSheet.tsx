import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string | null; is_verified: boolean };
}

interface CommentsSheetProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentAdded: () => void;
}

const CommentsSheet = ({ postId, open, onOpenChange, onCommentAdded }: CommentsSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadComments();
  }, [open, postId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!data) return;
    const userIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, is_verified")
      .in("user_id", userIds);

    setComments(
      data.map((c) => ({
        ...c,
        profile: profiles?.find((p) => p.user_id === c.user_id) || { display_name: "User", is_verified: false },
      }))
    );
  };

  const addComment = async () => {
    if (!user || !newComment.trim()) return;
    setLoading(true);
    await supabase.from("comments").insert({ user_id: user.id, post_id: postId, content: newComment.trim() });
    await supabase.from("posts").update({ comments_count: comments.length + 1 }).eq("id", postId);
    setNewComment("");
    await loadComments();
    onCommentAdded();
    setLoading(false);
  };

  const deleteComment = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id);
    await supabase.from("posts").update({ comments_count: Math.max(0, comments.length - 1) }).eq("id", postId);
    await loadComments();
    onCommentAdded();
    toast({ title: "Comment deleted" });
  };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display">Comments</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {c.profile?.display_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-xs">{c.profile?.display_name || "User"}</span>
                    {c.profile?.is_verified && <VerifiedBadge className="h-3 w-3" />}
                    <span className="text-xs text-muted-foreground">· {timeAgo(c.created_at)}</span>
                    {user?.id === c.user_id && (
                      <button onClick={() => deleteComment(c.id)} className="ml-auto text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No comments yet. Be the first!</p>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t border-border">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Post your reply..."
            className="min-h-[40px] resize-none"
            rows={2}
          />
          <Button onClick={addComment} disabled={!newComment.trim() || loading} size="icon" className="gradient-primary text-primary-foreground shrink-0 self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CommentsSheet;
