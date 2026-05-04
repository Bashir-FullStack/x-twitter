import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUp, Activity, Users, FileText } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

const chartConfig = {
  count: { label: "Count", color: "hsl(var(--primary))" },
  users: { label: "Users", color: "hsl(var(--primary))" },
  posts: { label: "Posts", color: "hsl(var(--accent))" },
};

const AdminCharts = () => {
  const [signups, setSignups] = useState<{ date: string; users: number }[]>([]);
  const [postsTrend, setPostsTrend] = useState<{ date: string; posts: number }[]>([]);
  const [roleDist, setRoleDist] = useState<{ name: string; value: number }[]>([]);
  const [topHashtags, setTopHashtags] = useState<{ name: string; count: number }[]>([]);
  const [activeNow, setActiveNow] = useState(0);

  const load = async () => {
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const [profilesRes, postsRes, rolesRes, hashtagsRes, activeRes] = await Promise.all([
      supabase.from("profiles").select("created_at").gte("created_at", since),
      supabase.from("posts").select("created_at").gte("created_at", since),
      supabase.from("user_roles").select("role"),
      supabase.from("hashtags").select("name, post_count").order("post_count", { ascending: false }).limit(8),
      supabase.from("profiles").select("user_id", { count: "exact", head: true }).gte("last_seen", new Date(Date.now() - 90000).toISOString()),
    ]);

    const buildDaily = (rows: any[] | null, key: string) => {
      const map: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(5, 10);
        map[d] = 0;
      }
      (rows || []).forEach(r => {
        const d = r.created_at.slice(5, 10);
        if (d in map) map[d]++;
      });
      return Object.entries(map).map(([date, v]) => ({ date, [key]: v } as any));
    };
    setSignups(buildDaily(profilesRes.data, "users"));
    setPostsTrend(buildDaily(postsRes.data, "posts"));

    const counts: Record<string, number> = {};
    (rolesRes.data || []).forEach((r: any) => { counts[r.role] = (counts[r.role] || 0) + 1; });
    setRoleDist(Object.entries(counts).map(([name, value]) => ({ name, value })));

    setTopHashtags((hashtagsRes.data || []).map((h: any) => ({ name: `#${h.name}`, count: h.post_count })));
    setActiveNow(activeRes.count || 0);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel("admin-charts")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, load)
      .subscribe();
    const interval = setInterval(load, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  return (
    <div className="grid gap-3 md:grid-cols-2 animate-fade-in">
      <Card className="border-border/50 md:col-span-2">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-success" /> Active Now (live)</CardTitle>
          <div className="flex items-center gap-2"><span className="relative h-2 w-2 rounded-full bg-success"><span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" /></span><span className="text-2xl font-bold font-display">{activeNow}</span></div>
        </CardHeader>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Signups (14 days)</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <AreaChart data={signups}>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-accent" /> Posts (14 days)</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <LineChart data={postsTrend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="posts" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Roles distribution</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <PieChart>
              <Pie data={roleDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={{ fontSize: 11 }}>
                {roleDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-warning" /> Top hashtags</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <BarChart data={topHashtags} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--warning))" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCharts;
