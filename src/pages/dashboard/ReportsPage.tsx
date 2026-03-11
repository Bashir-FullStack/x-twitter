import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ReportsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("reports").select("*").eq("reporter_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setReports(data || []);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">My Reports</h1>
      </div>
      {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : reports.length === 0 ? (
        <div className="text-center py-20"><Flag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">No reports submitted</p></div>
      ) : (
        <div className="divide-y divide-border">
          {reports.map(r => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-center gap-2"><span className="font-medium text-[15px]">{r.reason}</span><Badge variant={r.status === "pending" ? "destructive" : "secondary"} className="text-[10px]">{r.status}</Badge></div>
              <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              {r.admin_notes && <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">Admin: {r.admin_notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
