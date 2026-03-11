import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Activity } from "lucide-react";

const ActivityLogPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("activity_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100).then(({ data }) => {
      setLogs(data || []);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Your Activity</h1>
      </div>
      {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : logs.length === 0 ? (
        <div className="text-center py-20"><Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">No activity recorded</p></div>
      ) : (
        <div className="divide-y divide-border">
          {logs.map(l => (
            <div key={l.id} className="px-4 py-3">
              <p className="text-[15px]">{l.action}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{new Date(l.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLogPage;
