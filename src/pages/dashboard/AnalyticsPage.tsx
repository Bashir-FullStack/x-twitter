import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Eye, FileText, MessageSquare, Users } from "lucide-react";

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ posts: 0, published: 0, messages: 0, totalViews: 0 });

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      const [postsRes, publishedRes, messagesRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
      ]);
      const { data: viewsData } = await supabase.from("posts").select("views_count").eq("user_id", user.id);
      const totalViews = viewsData?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
      setStats({ posts: postsRes.count || 0, published: publishedRes.count || 0, messages: messagesRes.count || 0, totalViews });
    };
    loadStats();
  }, [user]);

  const cards = [
    { label: "Total Posts", value: stats.posts, icon: FileText, color: "text-primary" },
    { label: "Published", value: stats.published, icon: TrendingUp, color: "text-success" },
    { label: "Total Views", value: stats.totalViews, icon: Eye, color: "text-warning" },
    { label: "Messages Sent", value: stats.messages, icon: MessageSquare, color: "text-accent" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Your content performance overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold font-display">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5" /> Performance Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-3xl font-bold font-display text-primary">{stats.posts > 0 ? Math.round((stats.published / stats.posts) * 100) : 0}%</p>
              <p className="text-sm text-muted-foreground mt-1">Publish Rate</p>
            </div>
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-3xl font-bold font-display text-success">{stats.posts > 0 ? Math.round(stats.totalViews / stats.posts) : 0}</p>
              <p className="text-sm text-muted-foreground mt-1">Avg. Views/Post</p>
            </div>
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-3xl font-bold font-display text-warning">{stats.messages}</p>
              <p className="text-sm text-muted-foreground mt-1">Conversations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
