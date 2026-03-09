import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Shield, FileText, Flag, CheckCircle, XCircle, BadgeCheck,
  Search, UserPlus, Trash2, Edit, BarChart3, AlertTriangle, Ban
} from "lucide-react";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  is_verified: boolean;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const AdminPage = () => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [suggestedFollowIds, setSuggestedFollowIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, posts: 0, groups: 0, reports: 0 });

  // Create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", display_name: "", role: "user" });

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, reportsRes, postsRes, groupsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("groups").select("*").order("created_at", { ascending: false }),
    ]);

    // Get roles for all users
    const userIds = profilesRes.data?.map((p) => p.user_id) || [];
    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");

    const usersWithRoles: UserProfile[] = (profilesRes.data || []).map((p) => ({
      ...p,
      roles: rolesData?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
    }));

    setUsers(usersWithRoles);
    setReports((reportsRes.data as Report[]) || []);
    setPosts(postsRes.data || []);
    setGroups(groupsRes.data || []);
    setStats({
      users: usersWithRoles.length,
      posts: postsRes.data?.length || 0,
      groups: groupsRes.data?.length || 0,
      reports: reportsRes.data?.filter((r) => r.status === "pending").length || 0,
    });
    setLoading(false);
  };

  const toggleVerify = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !currentStatus }).eq("user_id", userId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: currentStatus ? "Verification removed" : "User verified with blue tick ✓" });
    loadData();
  };

  const updateRole = async (userId: string, newRole: string) => {
    // Remove existing roles and add new one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Role updated to ${newRole}` });
    loadData();
  };

  const deletePost = async (postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    toast({ title: "Post deleted" });
    loadData();
  };

  const resolveReport = async (reportId: string, status: string) => {
    await supabase.from("reports").update({ status, resolved_at: new Date().toISOString() }).eq("id", reportId);
    toast({ title: `Report ${status}` });
    loadData();
  };

  const deleteGroup = async (groupId: string) => {
    await supabase.from("groups").delete().eq("id", groupId);
    toast({ title: "Group deleted" });
    loadData();
  };

  const filteredUsers = users.filter((u) =>
    !searchQuery || u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.user_id.includes(searchQuery)
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-16 w-16 text-destructive/50 mb-4" />
        <h2 className="font-display text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, content, groups, and reports</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground"><UserPlus className="mr-2 h-4 w-4" /> Create User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Note: New users must be created through the signup flow. Use this to manage existing user roles and verification.</p>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
          { label: "Total Posts", value: stats.posts, icon: FileText, color: "text-success" },
          { label: "Groups", value: stats.groups, icon: Users, color: "text-warning" },
          { label: "Pending Reports", value: stats.reports, icon: Flag, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold font-display">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="reports">Reports ({stats.reports})</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <Card key={u.user_id} className="border-border/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {u.display_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{u.display_name || "User"}</span>
                        {u.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" || r === "super_admin" ? "default" : "secondary"} className="text-[10px]">{r}</Badge>
                        ))}
                        <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={u.is_verified ? "outline" : "default"} size="sm" onClick={() => toggleVerify(u.user_id, u.is_verified)} title={u.is_verified ? "Remove blue tick" : "Give blue tick"}>
                      <BadgeCheck className={`h-4 w-4 ${u.is_verified ? "text-muted-foreground" : ""}`} />
                    </Button>
                    <Select value={u.roles[0] || "user"} onValueChange={(v) => updateRole(u.user_id, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-2">
          {posts.map((post) => (
            <Card key={post.id} className="border-border/50">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{post.title}</span>
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
          {posts.length === 0 && <p className="text-center text-muted-foreground py-8">No content to moderate</p>}
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-2">
          {groups.map((group) => (
            <Card key={group.id} className="border-border/50">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <span className="font-medium text-sm">{group.name}</span>
                  <p className="text-xs text-muted-foreground">{group.description || "No description"} · {group.is_public ? "Public" : "Private"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteGroup(group.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
          {groups.length === 0 && <p className="text-center text-muted-foreground py-8">No groups</p>}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-2">
          {reports.map((report) => (
            <Card key={report.id} className={`border-border/50 ${report.status === "pending" ? "border-warning/30" : ""}`}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-warning" />
                    <span className="font-medium text-sm">{report.reason}</span>
                    <Badge variant={report.status === "pending" ? "destructive" : "secondary"}>{report.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(report.created_at).toLocaleDateString()}</p>
                </div>
                {report.status === "pending" && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => resolveReport(report.id, "resolved")} className="text-success"><CheckCircle className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => resolveReport(report.id, "dismissed")} className="text-destructive"><XCircle className="h-4 w-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {reports.length === 0 && <p className="text-center text-muted-foreground py-8">No reports</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
