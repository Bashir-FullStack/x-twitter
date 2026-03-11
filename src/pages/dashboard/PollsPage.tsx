import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BarChart3 } from "lucide-react";

const PollsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: myPosts } = await supabase.from("posts").select("id").eq("user_id", user.id);
      if (!myPosts?.length) { setLoading(false); return; }
      const { data: pollsData } = await supabase.from("polls").select("*, poll_options(*)").in("post_id", myPosts.map(p => p.id));
      setPolls(pollsData || []);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">My Polls</h1>
      </div>
      {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : polls.length === 0 ? (
        <div className="text-center py-20"><BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><h2 className="font-display font-bold text-xl">No polls yet</h2><p className="text-muted-foreground text-[15px]">Create a post with a poll to see results here</p></div>
      ) : (
        <div className="divide-y divide-border">
          {polls.map(p => {
            const totalVotes = (p.poll_options || []).reduce((s: number, o: any) => s + o.votes_count, 0);
            return (
              <div key={p.id} className="px-4 py-4">
                <p className="font-bold text-[15px] mb-2">{p.question}</p>
                <div className="space-y-2">
                  {(p.poll_options || []).map((o: any) => {
                    const pct = totalVotes > 0 ? Math.round((o.votes_count / totalVotes) * 100) : 0;
                    return (
                      <div key={o.id} className="relative rounded-lg overflow-hidden bg-muted p-3">
                        <div className="absolute inset-y-0 left-0 bg-primary/20 transition-all" style={{ width: `${pct}%` }} />
                        <div className="relative flex justify-between"><span className="text-[15px]">{o.text}</span><span className="text-[13px] font-bold">{pct}%</span></div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{totalVotes} votes · Ends {new Date(p.ends_at).toLocaleDateString()}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PollsPage;
