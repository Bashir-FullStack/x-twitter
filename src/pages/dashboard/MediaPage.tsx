import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Image } from "lucide-react";

const MediaPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("posts").select("id, title, image_url, created_at").eq("user_id", user.id).not("image_url", "is", null).order("created_at", { ascending: false }).then(({ data }) => {
      setMedia(data || []);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Media</h1>
      </div>
      {loading ? (
        <div className="grid grid-cols-3 gap-px">{[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-muted animate-pulse" />)}</div>
      ) : media.length === 0 ? (
        <div className="text-center py-20"><Image className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><h2 className="font-display font-bold text-xl">No media yet</h2><p className="text-muted-foreground text-[15px]">Photos and videos you post will appear here</p></div>
      ) : (
        <div className="grid grid-cols-3 gap-px">
          {media.map(m => (
            <div key={m.id} className="aspect-square cursor-pointer relative group" onClick={() => navigate(`/dashboard/post/${m.id}`)}>
              {m.image_url?.includes(".mp4") || m.image_url?.includes(".webm") ? (
                <video src={m.image_url} className="w-full h-full object-cover" />
              ) : (
                <img src={m.image_url} alt={m.title} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaPage;
