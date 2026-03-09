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
  const [focused, setFocused] = useState(false);

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);

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
      for (const tag of hashtags) {
        await supabase.from("hashtags").upsert({ name: tag, post_count: 1 }, { onConflict: "name" });
      }
      setContent("");
      setFocused(false);
      onPostCreated();
    }
    setPosting(false);
  };

  const charCount = content.length;
  const maxChars = 500;
  const isOverLimit = charCount > maxChars;

  return (
    <div className="border-b border-border p-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {user?.user_metadata?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          {focused && (
            <div className="flex items-center gap-1 mb-2">
              <Button variant="outline" size="sm" className="rounded-full text-xs h-6 px-3 text-primary border-primary/30">
                <Globe className="h-3 w-3 mr-1" /> Everyone can reply
              </Button>
            </div>
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="What is happening?!"
            className="border-0 bg-transparent resize-none text-xl placeholder:text-muted-foreground/50 focus-visible:ring-0 p-0 min-h-[28px]"
            rows={focused ? 3 : 1}
          />
          <div className={`flex items-center justify-between mt-3 ${focused ? "pt-3 border-t border-border/50" : ""}`}>
            <div className="flex items-center gap-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full">
                <Image className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full">
                <BarChart3 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full">
                <Smile className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full">
                <MapPin className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <div className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                  {charCount}/{maxChars}
                </div>
              )}
              <Button
                onClick={handlePost}
                disabled={!content.trim() || posting || isOverLimit}
                className="gradient-primary text-primary-foreground rounded-full px-5 h-9 font-bold text-[15px]"
              >
                {posting ? "..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
