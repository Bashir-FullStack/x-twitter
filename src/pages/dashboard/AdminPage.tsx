import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Shield, FileText, Flag, CheckCircle, XCircle, BadgeCheck,
  Search, UserPlus, Trash2, Edit, BarChart3, AlertTriangle, Ban,
  Send, Eye, Download, Clock, Activity, Megaphone, Lock, Unlock
} from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  is_verified: boolean;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
  privacy_settings: any;
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
  const [stats, setStats] = useState({ users: 0, posts: 0, groups: 0, reports: 0, messages: 0, likes: 0 });
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
  const [suspendedUsers, setSuspendedUsers] = useState<Set<string>>(new Set());
  const [activityLog, setActivityLog] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, reportsRes, postsRes, groupsRes, suggestedRes, activityRes, messagesCount, likesCount] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("groups").select("*").order("created_at", { ascending: false }),
      supabase.from("suggested_follows").select("user_id"),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("likes").select("id", { count: "exact", head: true }),
    ]);

    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");

    const usersWithRoles: UserProfile[] = (profilesRes.data || []).map((p) => ({
      ...p,
      roles: rolesData?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
    }));

    setSuggestedFollowIds(new Set(suggestedRes.data?.map((s) => s.user_id) || []));
    setUsers(usersWithRoles);
    setReports((reportsRes.data as Report[]) || []);
    setPosts(postsRes.data || []);
    setGroups(groupsRes.data || []);
    setActivityLog(activityRes.data || []);
    setStats({
      users: usersWithRoles.length,
      posts: postsRes.data?.length || 0,
      groups: groupsRes.data?.length || 0,
      reports: reportsRes.data?.filter((r) => r.status === "pending").length || 0,
      messages: messagesCount.count || 0,
      likes: likesCount.count || 0,
    });
    setLoading(false);
  };

  const toggleVerify = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !currentStatus }).eq("user_id", userId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: currentStatus ? "Blue tick removed ✕" : "Blue tick granted ✓" });
    loadData();
  };

  const updateRole = async (userId: string, newRole: string) => {
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

  const resolveReport = async (reportId: string, status: string, notes?: string) => {
    const updateData: any = { status, resolved_at: new Date().toISOString() };
    if (notes) updateData.admin_notes = notes;
    await supabase.from("reports").update(updateData).eq("id", reportId);
    toast({ title: `Report ${status}` });
    loadData();
  };

  const deleteGroup = async (groupId: string) => {
    await supabase.from("groups").delete().eq("id", groupId);
    toast({ title: "Group deleted" });
    loadData();
  };

  const toggleSuggestedFollow = async (userId: string) => {
    if (suggestedFollowIds.has(userId)) {
      await supabase.from("suggested_follows").delete().eq("user_id", userId);
      toast({ title: "Removed from suggested follows" });
    } else {
      await supabase.from("suggested_follows").insert({ user_id: userId, is_mandatory: true });
      toast({ title: "Added to suggested follows" });
    }
    loadData();
  };

  // Ban user (delete all their posts and set a flag)
  const banUser = async (userId: string) => {
    await supabase.from("posts").delete().eq("user_id", userId);
    setBannedUsers(prev => new Set(prev).add(userId));
    toast({ title: "User banned — all posts deleted", variant: "destructive" });
    // Log activity
    if (user) {
      await supabase.from("activity_log").insert({ user_id: user.id, action: `Banned user`, details: { banned_user_id: userId } });
    }
    loadData();
  };

  // Suspend user (remove their published posts temporarily)
  const suspendUser = async (userId: string) => {
    await supabase.from("posts").update({ status: "draft" }).eq("user_id", userId).eq("status", "published");
    setSuspendedUsers(prev => new Set(prev).add(userId));
    toast({ title: "User suspended — posts hidden" });
    loadData();
  };

  const unsuspendUser = async (userId: string) => {
    await supabase.from("posts").update({ status: "published" }).eq("user_id", userId).eq("status", "draft");
    setSuspendedUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
    toast({ title: "User unsuspended — posts restored" });
    loadData();
  };

  // Broadcast message to all users
  const sendBroadcast = async () => {
    if (!broadcastMsg.trim() || !user) return;
    setBroadcastSending(true);
    const userIds = users.map(u => u.user_id).filter(id => id !== user.id);
    const notifications = userIds.map(uid => ({
      user_id: uid,
      title: "📢 Admin Broadcast",
      body: broadcastMsg,
      type: "system",
    }));
    // Insert in batches of 50
    for (let i = 0; i < notifications.length; i += 50) {
      await supabase.from("notifications").insert(notifications.slice(i, i + 50));
    }
    toast({ title: `Broadcast sent to ${userIds.length} users` });
    setBroadcastMsg("");
    setBroadcastOpen(false);
    setBroadcastSending(false);
  };

  // Export platform data
  const exportData = () => {
    const data = { users: users.map(u => ({ name: u.display_name, verified: u.is_verified, roles: u.roles, joined: u.created_at })), stats, posts: posts.length, reports: reports.length };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `platform-data-${new Date().toISOString().split("T")[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported" });
  };

  const filteredUsers = users.filter((u) =>
    !searchQuery || u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.user_id.includes(searchQuery)
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-16 w-16 text-destructive/50 mb-4" />
        <h2 className="font-display text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You need admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Manage users, content, reports. Admins auto-receive blue tick ✓</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportData}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground"><Megaphone className="h-4 w-4 mr-1" /> Broadcast</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Send Broadcast</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Send a notification to all {users.length - 1} users</p>
              <Textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Type your message..." rows={4} className="resize-none" maxLength={500} />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{broadcastMsg.length}/500</span>
                <Button onClick={sendBroadcast} disabled={!broadcastMsg.trim() || broadcastSending} className="rounded-full gradient-primary text-primary-foreground font-bold">
                  {broadcastSending ? "Sending..." : <><Send className="h-4 w-4 mr-1" /> Send to all</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Users", value: stats.users, icon: Users, color: "text-primary" },
          { label: "Posts", value: stats.posts, icon: FileText, color: "text-success" },
          { label: "Groups", value: stats.groups, icon: Users, color: "text-warning" },
          { label: "Reports", value: stats.reports, icon: Flag, color: "text-destructive" },
          { label: "Messages", value: stats.messages, icon: Send, color: "text-primary" },
          { label: "Likes", value: stats.likes, icon: BarChart3, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-xl font-bold font-display">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="reports">Reports ({stats.reports})</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
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
              <Card key={u.user_id} className={`border-border/50 ${bannedUsers.has(u.user_id) ? "opacity-50 border-destructive/30" : suspendedUsers.has(u.user_id) ? "border-warning/30" : ""}`}>
                <CardContent className="flex items-center justify-between p-4 gap-2 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                      {u.display_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm truncate">{u.display_name || "User"}</span>
                        {u.is_verified && <VerifiedBadge className="h-4 w-4" />}
                        {bannedUsers.has(u.user_id) && <Badge variant="destructive" className="text-[9px]">BANNED</Badge>}
                        {suspendedUsers.has(u.user_id) && <Badge className="text-[9px] bg-warning text-warning-foreground">SUSPENDED</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" || r === "super_admin" ? "default" : "secondary"} className="text-[10px]">{r}</Badge>
                        ))}
                        <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button variant={u.is_verified ? "outline" : "default"} size="sm" onClick={() => toggleVerify(u.user_id, u.is_verified)} title={u.is_verified ? "Remove blue tick" : "Give blue tick"}>
                      <BadgeCheck className={`h-4 w-4 ${u.is_verified ? "text-muted-foreground" : ""}`} />
                    </Button>
                    <Button variant={suggestedFollowIds.has(u.user_id) ? "default" : "outline"} size="sm" onClick={() => toggleSuggestedFollow(u.user_id)} title="Must-follow">
                      <UserPlus className={`h-4 w-4 ${suggestedFollowIds.has(u.user_id) ? "" : "text-muted-foreground"}`} />
                    </Button>
                    {suspendedUsers.has(u.user_id) ? (
                      <Button variant="outline" size="sm" onClick={() => unsuspendUser(u.user_id)} title="Unsuspend"><Unlock className="h-4 w-4 text-success" /></Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => suspendUser(u.user_id)} title="Suspend"><Lock className="h-4 w-4 text-warning" /></Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => banUser(u.user_id)} title="Ban user" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                      <Ban className="h-4 w-4" />
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{post.title}</span>
                    <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-[10px]">{post.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.views_count}</span>
                    <span>❤️ {post.likes_count}</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
          {posts.length === 0 && <p className="text-center text-muted-foreground py-8">No content</p>}
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
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-warning" />
                    <span className="font-medium text-sm">{report.reason}</span>
                    <Badge variant={report.status === "pending" ? "destructive" : "secondary"}>{report.status}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
                {report.admin_notes && (
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">Notes: {report.admin_notes}</p>
                )}
                {report.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Admin notes..."
                      value={adminNotes[report.id] || ""}
                      onChange={e => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                      className="h-8 text-xs flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={() => resolveReport(report.id, "resolved", adminNotes[report.id])} className="text-success h-8"><CheckCircle className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => resolveReport(report.id, "dismissed", adminNotes[report.id])} className="text-destructive h-8"><XCircle className="h-4 w-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {reports.length === 0 && <p className="text-center text-muted-foreground py-8">No reports</p>}
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-2">
          {activityLog.length > 0 ? (
            activityLog.map((entry: any) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                <Activity className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()} {entry.ip_address ? `· ${entry.ip_address}` : ""}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No activity recorded</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
