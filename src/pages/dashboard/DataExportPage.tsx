import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, FileText, Image, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const DataExportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportMyData = async () => {
    if (!user) return;
    setExporting(true);
    const [posts, comments, likes, follows, profile] = await Promise.all([
      supabase.from("posts").select("*").eq("user_id", user.id),
      supabase.from("comments").select("*").eq("user_id", user.id),
      supabase.from("likes").select("*").eq("user_id", user.id),
      supabase.from("follows").select("*").eq("follower_id", user.id),
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    ]);
    const data = { profile: profile.data, posts: posts.data, comments: comments.data, likes: likes.data, follows: follows.data, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `my-data-${new Date().toISOString().split("T")[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported successfully" });
    setExporting(false);
  };

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Download Your Data</h1>
      </div>
      <div className="p-6 space-y-6">
        <p className="text-[15px] text-muted-foreground">Download a copy of your data. This includes your profile, posts, comments, likes, and follows.</p>
        <div className="space-y-3">
          {[{ icon: FileText, label: "Posts & Comments" }, { icon: Image, label: "Media" }, { icon: MessageSquare, label: "Messages" }].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl border border-border">
              <item.icon className="h-5 w-5 text-muted-foreground" /><span className="text-[15px]">{item.label}</span>
            </div>
          ))}
        </div>
        <Button onClick={exportMyData} disabled={exporting} className="w-full rounded-full gradient-primary text-primary-foreground font-bold h-12">
          <Download className="h-4 w-4 mr-2" />{exporting ? "Exporting..." : "Request Data Export"}
        </Button>
      </div>
    </div>
  );
};

export default DataExportPage;
