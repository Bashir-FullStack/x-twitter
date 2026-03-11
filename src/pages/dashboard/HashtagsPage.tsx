import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Hash, TrendingUp } from "lucide-react";

const HashtagsPage = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("hashtags").select("*").order("post_count", { ascending: false }).limit(50).then(({ data }) => {
      setTags(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Trending Hashtags</h1>
      </div>
      {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : tags.length === 0 ? (
        <div className="text-center py-20"><Hash className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">No hashtags yet</p></div>
      ) : (
        <div>
          {tags.map((tag, i) => (
            <div key={tag.id} className="px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
              <p className="text-[13px] text-muted-foreground">{i + 1} · Trending</p>
              <p className="font-bold text-[15px]">#{tag.name}</p>
              <p className="text-[13px] text-muted-foreground">{tag.post_count.toLocaleString()} posts</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HashtagsPage;
