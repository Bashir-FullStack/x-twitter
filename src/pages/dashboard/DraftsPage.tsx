import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileText, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const DraftsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("posts").select("*").eq("user_id", user.id).eq("status", "draft").order("updated_at", { ascending: false });
    setDrafts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const publishDraft = async (id: string) => {
    await supabase.from("posts").update({ status: "published" }).eq("id", id);
    toast({ title: "Draft published!" });
    load();
  };

  const deleteDraft = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    toast({ title: "Draft deleted" });
    load();
  };

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Drafts</h1>
      </div>
      {loading ? (
        <div className="divide-y divide-border">{[1,2,3].map(i => <div key={i} className="p-4 animate-pulse"><div className="h-4 w-48 bg-muted rounded" /></div>)}</div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-20"><FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><h2 className="font-display font-bold text-xl">No drafts</h2><p className="text-muted-foreground text-[15px]">Unsent posts will appear here</p></div>
      ) : (
        <div className="divide-y divide-border">
          {drafts.map(d => (
            <div key={d.id} className="px-4 py-3">
              <p className="font-semibold text-[15px]">{d.title}</p>
              {d.body && <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{d.body}</p>}
              <p className="text-xs text-muted-foreground mt-1">Last edited {new Date(d.updated_at).toLocaleDateString()}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="rounded-full text-xs" onClick={() => publishDraft(d.id)}><Send className="h-3 w-3 mr-1" /> Publish</Button>
                <Button size="sm" variant="ghost" className="text-destructive text-xs" onClick={() => deleteDraft(d.id)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DraftsPage;
