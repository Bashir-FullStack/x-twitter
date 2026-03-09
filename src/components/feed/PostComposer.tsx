import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Image, BarChart3, Smile, MapPin, Globe } from "lucide-react";

interface PostComposerProps {
  onPostCreated: () => void;
}

const PostComposer = ({ onPostCreated }: PostComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);

    // Extract hashtags
    const hashtags = content.match(/#\w+/g)?.map((h) => h.slice(1).toLowerCase()) || [];

    const { error } = await supabase.from("posts").insert({
      title: content.slice(0, 100),
      body: content,
      user_id: user.id,
      status: "published",
      tags: hashtags,
      category: "post",
    });

    if (error) {
      toast({ title: "Error posting", description: error.message, variant: "destructive" });
    } else {
      // Update hashtag counts
      for (const tag of hashtags) {
        await supabase.from("hashtags").upsert(
          { name: tag, post_count: 1 },
          { onConflict: "name" }
        );
      }
      setContent("");
      onPostCreated();
    }
    setPosting(false);
  };

  return (
    <div className="border-b border-border p-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {user?.user_metadata?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What is happening?!"
            className="border-0 bg-transparent resize-none text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 p-0 min-h-[60px]"
            rows={2}
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80">
                <Image className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80">
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80">
                <Smile className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80">
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handlePost}
              disabled={!content.trim() || posting}
              className="gradient-primary text-primary-foreground rounded-full px-5 h-9 font-semibold"
            >
              {posting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
