import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Globe, Lock, LogIn, LogOut } from "lucide-react";

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
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_public: true });

  const fetchGroups = async () => {
    if (!user) return;
    const { data: groupsData } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    const memberGroupIds = new Set(memberships?.map((m) => m.group_id) || []);

    // Get member counts
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
    // Add creator as admin member
    await supabase.from("group_members").insert({ group_id: data.id, user_id: user.id, role: "admin" });
    toast({ title: "Group created" });
    setDialogOpen(false);
    setForm({ name: "", description: "", is_public: true });
    fetchGroups();
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Joined group" });
    fetchGroups();
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    toast({ title: "Left group" });
    fetchGroups();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Groups</h1>
          <p className="text-muted-foreground">Join communities and connect with others</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> New Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Group</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Group name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              <div className="flex items-center justify-between">
                <Label>Public group</Label>
                <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
              </div>
              <Button onClick={createGroup} className="w-full gradient-primary text-primary-foreground">Create Group</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : groups.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No groups yet. Create the first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    {group.is_public ? <Globe className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-primary" />}
                  </div>
                  <Badge variant={group.is_public ? "default" : "secondary"}>{group.is_public ? "Public" : "Private"}</Badge>
                </div>
                <h3 className="font-display font-semibold">{group.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{group.description || "No description"}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {group.member_count} members</span>
                  {group.is_member ? (
                    <Button variant="outline" size="sm" onClick={() => leaveGroup(group.id)}><LogOut className="mr-1 h-3 w-3" /> Leave</Button>
                  ) : (
                    <Button size="sm" onClick={() => joinGroup(group.id)} className="gradient-primary text-primary-foreground"><LogIn className="mr-1 h-3 w-3" /> Join</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
