import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/UserAvatar";
import { Image, BarChart3, Smile, MapPin, Globe, X, Clock, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAvatarUrl } from "@/lib/avatar";
import { useEffect } from "react";

interface PostComposerProps {
  onPostCreated: () => void;
  quotedPost?: { id: string; body: string; profile: { display_name: string | null; is_verified: boolean } } | null;
  onClearQuote?: () => void;
}

const EMOJI_LIST = ["😀","😂","🥲","😍","🤔","😎","🔥","💯","❤️","👍","👎","🎉","😢","😡","🤯","✨","💀","🙏","👀","💪"];

const PostComposer = ({ onPostCreated, quotedPost, onClearQuote }: PostComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).single().then(({ data }) => setMyProfile(data));
    }
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojis(false);
    textareaRef.current?.focus();
  };

  const handlePost = async (asDraft = false) => {
    if (!user || (!content.trim() && !imageFile)) return;
    setPosting(true);

    let imageUrl: string | null = null;

    // Upload image if selected
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, imageFile, { upsert: true });
      if (uploadError) {
        toast({ title: "Image upload failed", description: uploadError.message, variant: "destructive" });
        setPosting(false);
        return;
      }
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      imageUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
    }

    const hashtags = content.match(/#\w+/g)?.map((h) => h.slice(1).toLowerCase()) || [];
    const status = asDraft ? "draft" : "published";

    const { error } = await supabase.from("posts").insert({
      title: content.slice(0, 100) || "Image post",
      body: content,
      user_id: user.id,
      status,
      tags: hashtags,
      category: quotedPost ? "quote" : "post",
      image_url: imageUrl,
    });

    if (error) {
      toast({ title: "Error posting", description: error.message, variant: "destructive" });
    } else {
      for (const tag of hashtags) {
        await supabase.from("hashtags").upsert({ name: tag, post_count: 1 }, { onConflict: "name" });
      }
      setContent("");
      setFocused(false);
      removeImage();
      onClearQuote?.();
      toast({ title: asDraft ? "Saved as draft" : "Posted!" });
      onPostCreated();
    }
    setPosting(false);
  };

  const charCount = content.length;
  const maxChars = 500;
  const isOverLimit = charCount > maxChars;
  const charPercentage = Math.min((charCount / maxChars) * 100, 100);

  return (
    <div className="border-b border-border p-4">
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageSelect} />
      
      <div className="flex gap-3">
        <UserAvatar
          avatarUrl={myProfile?.avatar_url}
          displayName={myProfile?.display_name || user?.email}
          className="h-10 w-10 shrink-0"
        />
        <div className="flex-1">
          {focused && (
            <div className="flex items-center gap-1 mb-2">
              <Button variant="outline" size="sm" className="rounded-full text-xs h-6 px-3 text-primary border-primary/30">
                <Globe className="h-3 w-3 mr-1" /> Everyone can reply
              </Button>
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="What is happening?!"
            className="border-0 bg-transparent resize-none text-xl placeholder:text-muted-foreground/50 focus-visible:ring-0 p-0 min-h-[28px]"
            rows={focused ? 3 : 1}
          />

          {/* Quoted post preview */}
          {quotedPost && (
            <div className="mt-2 border border-border rounded-xl p-3 relative">
              <button onClick={onClearQuote} className="absolute top-2 right-2 p-1 rounded-full bg-foreground/10 hover:bg-foreground/20">
                <X className="h-3 w-3" />
              </button>
              <p className="text-xs text-muted-foreground mb-1">
                <span className="font-bold text-foreground">{quotedPost.profile.display_name}</span>
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2">{quotedPost.body}</p>
            </div>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mt-3 rounded-2xl overflow-hidden border border-border">
              <img src={imagePreview} alt="Upload preview" className="w-full max-h-[300px] object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full p-1.5 hover:bg-foreground/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojis && (
            <div className="mt-2 p-2 bg-muted rounded-xl flex flex-wrap gap-1">
              {EMOJI_LIST.map(emoji => (
                <button key={emoji} onClick={() => addEmoji(emoji)} className="text-xl p-1.5 hover:bg-background rounded-lg transition-colors">
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className={`flex items-center justify-between mt-3 ${focused ? "pt-3 border-t border-border/50" : ""}`}>
            <div className="flex items-center gap-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full" onClick={() => fileInputRef.current?.click()}>
                <Image className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full">
                <BarChart3 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full" onClick={() => setShowEmojis(!showEmojis)}>
                <Smile className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full">
                <MapPin className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {content.length > 0 && (
                <div className="relative h-6 w-6">
                  <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" />
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                      className={isOverLimit ? "text-destructive" : "text-primary"}
                      strokeDasharray={`${charPercentage * 0.628} 100`}
                    />
                  </svg>
                </div>
              )}
              {focused && (
                <Button variant="ghost" size="sm" className="text-primary text-xs rounded-full h-7" onClick={() => handlePost(true)}>
                  <FileText className="h-3 w-3 mr-1" /> Draft
                </Button>
              )}
              <Button
                onClick={() => handlePost(false)}
                disabled={(!content.trim() && !imageFile) || posting || isOverLimit}
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
