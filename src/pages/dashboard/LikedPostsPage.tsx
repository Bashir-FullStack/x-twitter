import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Heart } from "lucide-react";

const LikedPostsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: likes } = await supabase.from("likes").select("post_id").eq("user_id", user.id).order("created_at", { ascending: false });
      if (!likes?.length) { setLoading(false); return; }
      const { data: postsData } = await supabase.from("posts").select("id, title, body, likes_count, views_count, created_at, user_id").in("id", likes.map(l => l.post_id));
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, is_verified").in("user_id", userIds);
      const profileMap = Object.fromEntries(profiles?.map(p => [p.user_id, p]) || []);
      setPosts((postsData || []).map(p => ({ ...p, profile: profileMap[p.user_id] })));
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Liked Posts</h1>
      </div>
      {loading ? (
        <div className="divide-y divide-border">{[1,2,3].map(i => <div key={i} className="p-4 animate-pulse"><div className="h-4 w-48 bg-muted rounded mb-2" /><div className="h-3 w-64 bg-muted rounded" /></div>)}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20"><Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><h2 className="font-display font-bold text-xl">No liked posts yet</h2><p className="text-muted-foreground text-[15px]">Posts you like will appear here</p></div>
      ) : (
        <div className="divide-y divide-border">
          {posts.map(p => (
            <div key={p.id} className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/post/${p.id}`)}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] text-muted-foreground">{p.profile?.display_name || "User"}</span>
              </div>
              <p className="font-semibold text-[15px]">{p.title}</p>
              {p.body && <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{p.body}</p>}
              <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                <span>❤️ {p.likes_count}</span><span>👁 {p.views_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LikedPostsPage;
