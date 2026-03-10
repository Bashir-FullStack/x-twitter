import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/UserAvatar";
import { Image, BarChart3, Smile, MapPin, Globe, X, FileText, Video } from "lucide-react";

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
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).single().then(({ data }) => setMyProfile(data));
    }
  }, [user]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = type === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: `Max ${type === "video" ? "50MB" : "10MB"}`, variant: "destructive" });
      return;
    }
    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojis(false);
    textareaRef.current?.focus();
  };

  const handlePost = async (asDraft = false) => {
    if (!user || (!content.trim() && !mediaFile)) return;
    setPosting(true);

    let mediaUrl: string | null = null;

    if (mediaFile) {
      const ext = mediaFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("post-images").upload(path, mediaFile, { upsert: true });
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setPosting(false);
        return;
      }
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      mediaUrl = `${SUPABASE_URL}/storage/v1/object/public/post-images/${path}`;
    }

    const hashtags = content.match(/#\w+/g)?.map((h) => h.slice(1).toLowerCase()) || [];
    const status = asDraft ? "draft" : "published";

    const { error } = await supabase.from("posts").insert({
      title: content.slice(0, 100) || (mediaType === "video" ? "Video post" : "Image post"),
      body: content,
      user_id: user.id,
      status,
      tags: hashtags,
      category: quotedPost ? "quote" : "post",
      image_url: mediaUrl,
    });

    if (error) {
      toast({ title: "Error posting", description: error.message, variant: "destructive" });
    } else {
      for (const tag of hashtags) {
        await supabase.from("hashtags").upsert({ name: tag, post_count: 1 }, { onConflict: "name" });
      }
      setContent("");
      setFocused(false);
      removeMedia();
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
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaSelect(e, "image")} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/ogg,video/mov" className="hidden" onChange={(e) => handleMediaSelect(e, "video")} />

      <div className="flex gap-3">
        <UserAvatar avatarUrl={myProfile?.avatar_url} displayName={myProfile?.display_name || user?.email} className="h-10 w-10 shrink-0" />
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

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative mt-3 rounded-2xl overflow-hidden border border-border">
              {mediaType === "video" ? (
                <video src={mediaPreview} controls className="w-full max-h-[300px] object-cover" />
              ) : (
                <img src={mediaPreview} alt="Upload preview" className="w-full max-h-[300px] object-cover" />
              )}
              <button onClick={removeMedia} className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full p-1.5 hover:bg-foreground/90 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

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
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full" onClick={() => videoInputRef.current?.click()}>
                <Video className="h-5 w-5" />
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
                disabled={(!content.trim() && !mediaFile) || posting || isOverLimit}
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
