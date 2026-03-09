import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Globe, Lock, LogIn, LogOut, ArrowLeft, Search, MoreHorizontal } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  max_members: number;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

const GroupsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_public: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("discover");

  const fetchGroups = async () => {
    if (!user) return;
    const { data: groupsData } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    const memberGroupIds = new Set(memberships?.map((m) => m.group_id) || []);

    const enriched = await Promise.all(
      (groupsData || []).map(async (g) => {
        const { count } = await supabase.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", g.id);
        return { ...g, member_count: count || 0, is_member: memberGroupIds.has(g.id) } as Group;
      })
    );
    setGroups(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, [user]);

  const createGroup = async () => {
    if (!user || !form.name.trim()) return;
    const { data, error } = await supabase.from("groups").insert({ name: form.name, description: form.description || null, is_public: form.is_public, created_by: user.id }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("group_members").insert({ group_id: data.id, user_id: user.id, role: "admin" });
    toast({ title: "Community created" });
    setDialogOpen(false);
    setForm({ name: "", description: "", is_public: true });
    fetchGroups();
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id });
    toast({ title: "Joined community" });
    fetchGroups();
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    toast({ title: "Left community" });
    fetchGroups();
  };

  const myGroups = groups.filter(g => g.is_member);
  const discoverGroups = groups.filter(g => !g.is_member && g.is_public);
  const filtered = searchQuery
    ? groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : (tab === "yours" ? myGroups : discoverGroups);

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-[53px]">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold">Communities</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create Community</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <Input placeholder="Community name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" />
                <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="resize-none" />
                <div className="flex items-center justify-between">
                  <Label>Public community</Label>
                  <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
                </div>
                <Button onClick={createGroup} className="w-full rounded-full gradient-primary text-primary-foreground font-bold h-11">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search communities"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-10"
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
            <TabsTrigger value="discover" className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">
              Discover
            </TabsTrigger>
            <TabsTrigger value="yours" className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">
              Your Communities
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-border">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3 p-4 animate-pulse">
              <div className="h-12 w-12 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 px-8">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl mb-1">
            {tab === "yours" ? "No communities yet" : "No communities to discover"}
          </h2>
          <p className="text-[15px] text-muted-foreground">
            {tab === "yours" ? "Join a community or create your own." : "Check back later for new communities."}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((group) => (
            <div key={group.id} className="flex items-center gap-3 px-4 py-4 border-b border-border hover:bg-muted/30 transition-colors">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                {group.is_public ? <Globe className="h-6 w-6 text-primary" /> : <Lock className="h-6 w-6 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px]">{group.name}</p>
                <p className="text-[13px] text-muted-foreground line-clamp-1">{group.description || "No description"}</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">{group.member_count} members · {group.is_public ? "Public" : "Private"}</p>
              </div>
              {group.is_member ? (
                <Button variant="outline" size="sm" className="rounded-full text-[13px] font-bold" onClick={() => leaveGroup(group.id)}>
                  Joined
                </Button>
              ) : (
                <Button size="sm" className="rounded-full text-[13px] font-bold bg-foreground text-background hover:bg-foreground/90" onClick={() => joinGroup(group.id)}>
                  Join
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
