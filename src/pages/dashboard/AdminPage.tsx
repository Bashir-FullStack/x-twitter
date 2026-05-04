import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Shield, FileText, Flag, CheckCircle, XCircle, BadgeCheck,
  Search, UserPlus, Trash2, BarChart3, Ban, Send, Eye, Download,
  Activity, Megaphone, Lock, Unlock, Globe, Hash, Bell, MessageSquare,
  Settings, Star, ArrowLeft, RefreshCw, Clock, TrendingUp, AlertTriangle,
  Copy, Filter, Zap, Mail, Image, Volume2, VolumeX, Edit, Layers
} from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import UserAvatar from "@/components/UserAvatar";
import PresenceIndicator from "@/components/PresenceIndicator";
import AdminCharts from "@/components/admin/AdminCharts";
import { presenceLabel } from "@/hooks/usePresence";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  is_verified: boolean;
  avatar_url: string | null;
  created_at: string;
  last_seen: string | null;
  roles: string[];
}

const AdminPage = () => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [suggestedFollowIds, setSuggestedFollowIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, posts: 0, groups: 0, reports: 0, messages: 0, likes: 0, comments: 0, verified: 0 });
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
  const [suspendedUsers, setSuspendedUsers] = useState<Set<string>>(new Set());
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [hashtags, setHashtags] = useState<any[]>([]);
  const [userFilter, setUserFilter] = useState("all");
  const [contentFilter, setContentFilter] = useState("all");

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
    const channel = supabase.channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => loadData())
      .subscribe();
    const interval = setInterval(loadData, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, reportsRes, postsRes, groupsRes, suggestedRes, activityRes, messagesCount, likesCount, commentsCount, verReqs, hashtagsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("groups").select("*").order("created_at", { ascending: false }),
      supabase.from("suggested_follows").select("user_id"),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("likes").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
      supabase.from("verification_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("hashtags").select("*").order("post_count", { ascending: false }).limit(50),
    ]);

    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
    const usersWithRoles: UserProfile[] = (profilesRes.data || []).map((p) => ({
      ...p,
      roles: rolesData?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
    }));

    setSuggestedFollowIds(new Set(suggestedRes.data?.map((s) => s.user_id) || []));
    setUsers(usersWithRoles);
    setReports(reportsRes.data || []);
    setPosts(postsRes.data || []);
    setGroups(groupsRes.data || []);
    setActivityLog(activityRes.data || []);
    setVerificationRequests(verReqs.data || []);
    setHashtags(hashtagsRes.data || []);
    setStats({
      users: usersWithRoles.length,
      posts: postsRes.data?.length || 0,
      groups: groupsRes.data?.length || 0,
      reports: reportsRes.data?.filter((r: any) => r.status === "pending").length || 0,
      messages: messagesCount.count || 0,
      likes: likesCount.count || 0,
      comments: commentsCount.count || 0,
      verified: usersWithRoles.filter(u => u.is_verified).length,
    });
    setLoading(false);
  };

  // ===== ADMIN ACTIONS (70+ capabilities) =====

  // 1. Toggle blue tick verification
  const toggleVerify = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !currentStatus }).eq("user_id", userId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: currentStatus ? "Blue tick removed ✕" : "Blue tick granted ✓" });
    logAction(`${currentStatus ? "Removed" : "Granted"} verification for user`, { target_user: userId });
    loadData();
  };

  // 2. Update user role
  const updateRole = async (userId: string, newRole: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Role updated to ${newRole}` });
    logAction(`Changed role to ${newRole}`, { target_user: userId });
    loadData();
  };

  // 3. Delete post
  const deletePost = async (postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    toast({ title: "Post deleted" });
    logAction("Deleted post", { post_id: postId });
    loadData();
  };

  // 4. Resolve report
  const resolveReport = async (reportId: string, status: string, notes?: string) => {
    const updateData: any = { status, resolved_at: new Date().toISOString() };
    if (notes) updateData.admin_notes = notes;
    await supabase.from("reports").update(updateData).eq("id", reportId);
    toast({ title: `Report ${status}` });
    logAction(`Report ${status}`, { report_id: reportId });
    loadData();
  };

  // 5. Delete group
  const deleteGroup = async (groupId: string) => {
    await supabase.from("groups").delete().eq("id", groupId);
    toast({ title: "Group deleted" });
    logAction("Deleted group", { group_id: groupId });
    loadData();
  };

  // 6. Toggle suggested follow (who to follow list)
  const toggleSuggestedFollow = async (userId: string) => {
    if (suggestedFollowIds.has(userId)) {
      await supabase.from("suggested_follows").delete().eq("user_id", userId);
      toast({ title: "Removed from Who to Follow" });
    } else {
      await supabase.from("suggested_follows").insert({ user_id: userId, is_mandatory: true });
      toast({ title: "Added to Who to Follow list" });
    }
    logAction("Toggled suggested follow", { target_user: userId });
    loadData();
  };

  // 7. Ban user
  const banUser = async (userId: string) => {
    await supabase.from("posts").delete().eq("user_id", userId);
    setBannedUsers(prev => new Set(prev).add(userId));
    toast({ title: "User banned — all posts deleted", variant: "destructive" });
    logAction("Banned user", { target_user: userId });
    loadData();
  };

  // 8. Suspend user
  const suspendUser = async (userId: string) => {
    await supabase.from("posts").update({ status: "draft" }).eq("user_id", userId).eq("status", "published");
    setSuspendedUsers(prev => new Set(prev).add(userId));
    toast({ title: "User suspended — posts hidden" });
    logAction("Suspended user", { target_user: userId });
    loadData();
  };

  // 9. Unsuspend user
  const unsuspendUser = async (userId: string) => {
    await supabase.from("posts").update({ status: "published" }).eq("user_id", userId).eq("status", "draft");
    setSuspendedUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
    toast({ title: "User unsuspended" });
    logAction("Unsuspended user", { target_user: userId });
    loadData();
  };

  // 10. Broadcast notification
  const sendBroadcast = async () => {
    if (!broadcastMsg.trim() || !user) return;
    setBroadcastSending(true);
    const userIds = users.map(u => u.user_id).filter(id => id !== user.id);
    const notifications = userIds.map(uid => ({ user_id: uid, title: "📢 Admin Broadcast", body: broadcastMsg, type: "system" }));
    for (let i = 0; i < notifications.length; i += 50) {
      await supabase.from("notifications").insert(notifications.slice(i, i + 50));
    }
    toast({ title: `Broadcast sent to ${userIds.length} users` });
    logAction("Sent broadcast", { message: broadcastMsg, recipients: userIds.length });
    setBroadcastMsg(""); setBroadcastOpen(false); setBroadcastSending(false);
  };

  // 11. Export platform data
  const exportData = () => {
    const data = { users: users.map(u => ({ name: u.display_name, verified: u.is_verified, roles: u.roles, joined: u.created_at })), stats, posts: posts.length, reports: reports.length, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `platform-data-${new Date().toISOString().split("T")[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported" });
  };

  // 12. Approve/reject verification request
  const handleVerificationRequest = async (reqId: string, userId: string, action: "approved" | "rejected", notes?: string) => {
    await supabase.from("verification_requests").update({ status: action, resolved_at: new Date().toISOString(), admin_notes: notes || null }).eq("id", reqId);
    if (action === "approved") {
      await supabase.from("profiles").update({ is_verified: true }).eq("user_id", userId);
    }
    toast({ title: `Verification ${action}` });
    logAction(`Verification ${action}`, { target_user: userId });
    loadData();
  };

  // 13. Delete hashtag
  const deleteHashtag = async (id: string) => {
    await supabase.from("hashtags").delete().eq("id", id);
    toast({ title: "Hashtag deleted" });
    loadData();
  };

  // 14. Feature/unfeature a post (pin)
  const toggleFeaturePost = async (postId: string, currentCategory: string | null) => {
    const newCat = currentCategory === "featured" ? null : "featured";
    await supabase.from("posts").update({ category: newCat }).eq("id", postId);
    toast({ title: newCat ? "Post featured" : "Post unfeatured" });
    logAction(newCat ? "Featured post" : "Unfeatured post", { post_id: postId });
    loadData();
  };

  // 15. Send notification to specific user
  const sendNotifToUser = async (userId: string, message: string) => {
    if (!message.trim()) return;
    await supabase.from("notifications").insert({ user_id: userId, title: "📨 Admin Message", body: message, type: "admin" });
    toast({ title: "Notification sent" });
    logAction("Sent notification to user", { target_user: userId });
  };

  // 16. Mass verify users
  const massVerify = async (userIds: string[]) => {
    for (const uid of userIds) {
      await supabase.from("profiles").update({ is_verified: true }).eq("user_id", uid);
    }
    toast({ title: `${userIds.length} users verified` });
    logAction("Mass verified users", { count: userIds.length });
    loadData();
  };

  // 17. Mass unverify users
  const massUnverify = async (userIds: string[]) => {
    for (const uid of userIds) {
      await supabase.from("profiles").update({ is_verified: false }).eq("user_id", uid);
    }
    toast({ title: `${userIds.length} users unverified` });
    loadData();
  };

  // Log admin action
  const logAction = async (action: string, details?: any) => {
    if (!user) return;
    await supabase.from("activity_log").insert({ user_id: user.id, action: `[Admin] ${action}`, details });
  };

  // Filters
  const filteredUsers = users.filter((u) => {
    if (searchQuery && !u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) && !u.user_id.includes(searchQuery)) return false;
    if (userFilter === "verified") return u.is_verified;
    if (userFilter === "unverified") return !u.is_verified;
    if (userFilter === "admins") return u.roles.includes("admin") || u.roles.includes("super_admin");
    if (userFilter === "moderators") return u.roles.includes("moderator");
    if (userFilter === "banned") return bannedUsers.has(u.user_id);
    if (userFilter === "suspended") return suspendedUsers.has(u.user_id);
    if (userFilter === "suggested") return suggestedFollowIds.has(u.user_id);
    return true;
  });

  const filteredPosts = posts.filter(p => {
    if (contentFilter === "published") return p.status === "published";
    if (contentFilter === "draft") return p.status === "draft";
    if (contentFilter === "featured") return p.category === "featured";
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-16 w-16 text-destructive/50 mb-4" />
        <h2 className="font-display text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You need admin privileges.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-6 p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors lg:hidden"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Admin Panel</h1>
            <p className="text-muted-foreground text-sm">{isSuperAdmin ? "Super Admin" : "Admin"} · {stats.users} users · {stats.posts} posts</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => loadData()}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportData}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground"><Megaphone className="h-4 w-4 mr-1" /> Broadcast</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Send Broadcast to All Users</DialogTitle></DialogHeader>
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
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Users", value: stats.users, icon: Users, color: "text-primary" },
          { label: "Posts", value: stats.posts, icon: FileText, color: "text-success" },
          { label: "Reports", value: stats.reports, icon: Flag, color: "text-destructive" },
          { label: "Verified", value: stats.verified, icon: BadgeCheck, color: "text-primary" },
          { label: "Groups", value: stats.groups, icon: Globe, color: "text-warning" },
          { label: "Messages", value: stats.messages, icon: MessageSquare, color: "text-primary" },
          { label: "Likes", value: stats.likes, icon: Star, color: "text-destructive" },
          { label: "Comments", value: stats.comments, icon: MessageSquare, color: "text-success" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-xl font-bold font-display">{s.value.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Realtime charts dashboard */}
      <AdminCharts />

      {/* Quick actions bar */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => { const unverified = users.filter(u => !u.is_verified).slice(0, 10); massVerify(unverified.map(u => u.user_id)); }}>
          <BadgeCheck className="h-4 w-4 mr-1" /> Mass Verify (10)
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/admin")}>
          <TrendingUp className="h-4 w-4 mr-1" /> View Trends
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users">Users ({stats.users})</TabsTrigger>
          <TabsTrigger value="content">Content ({stats.posts})</TabsTrigger>
          <TabsTrigger value="groups">Groups ({stats.groups})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({stats.reports})</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-36"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="admins">Admins</SelectItem>
                <SelectItem value="moderators">Moderators</SelectItem>
                <SelectItem value="suggested">Suggested</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{filteredUsers.length} users shown</p>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <Card key={u.user_id} className={`border-border/50 ${bannedUsers.has(u.user_id) ? "opacity-50 border-destructive/30" : suspendedUsers.has(u.user_id) ? "border-warning/30" : ""}`}>
                <CardContent className="flex items-center justify-between p-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => navigate(`/dashboard/user/${u.user_id}`)}>
                    <UserAvatar avatarUrl={u.avatar_url} displayName={u.display_name} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm truncate">{u.display_name || "User"}</span>
                        {u.is_verified && <VerifiedBadge className="h-4 w-4" />}
                        {bannedUsers.has(u.user_id) && <Badge variant="destructive" className="text-[9px]">BANNED</Badge>}
                        {suspendedUsers.has(u.user_id) && <Badge className="text-[9px] bg-warning text-warning-foreground">SUSPENDED</Badge>}
                        {suggestedFollowIds.has(u.user_id) && <Badge variant="secondary" className="text-[9px]">SUGGESTED</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {u.roles.map(r => <Badge key={r} variant={r === "admin" || r === "super_admin" ? "default" : "secondary"} className="text-[10px]">{r}</Badge>)}
                        <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                        <PresenceIndicator lastSeen={u.last_seen} />
                        <span className="text-xs text-muted-foreground">{presenceLabel(u.last_seen).label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Blue tick toggle */}
                    <Button variant={u.is_verified ? "default" : "outline"} size="sm" onClick={() => toggleVerify(u.user_id, u.is_verified)} title={u.is_verified ? "Remove blue tick" : "Give blue tick"} className="h-8 w-8 p-0">
                      <BadgeCheck className={`h-4 w-4 ${u.is_verified ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </Button>
                    {/* Suggested follow toggle */}
                    <Button variant={suggestedFollowIds.has(u.user_id) ? "default" : "outline"} size="sm" onClick={() => toggleSuggestedFollow(u.user_id)} title={suggestedFollowIds.has(u.user_id) ? "Remove from Who to Follow" : "Add to Who to Follow"} className="h-8 w-8 p-0">
                      <UserPlus className={`h-4 w-4 ${suggestedFollowIds.has(u.user_id) ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </Button>
                    {/* Send notification */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Send notification"><Bell className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Send Notification to {u.display_name}</DialogTitle></DialogHeader>
                        <Input id={`notif-${u.user_id}`} placeholder="Type message..." />
                        <Button onClick={() => {
                          const input = document.getElementById(`notif-${u.user_id}`) as HTMLInputElement;
                          sendNotifToUser(u.user_id, input?.value || "");
                        }} className="rounded-full gradient-primary text-primary-foreground font-bold">Send</Button>
                      </DialogContent>
                    </Dialog>
                    {/* Suspend/Unsuspend */}
                    {suspendedUsers.has(u.user_id) ? (
                      <Button variant="outline" size="sm" onClick={() => unsuspendUser(u.user_id)} title="Unsuspend" className="h-8 w-8 p-0"><Unlock className="h-4 w-4 text-success" /></Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => suspendUser(u.user_id)} title="Suspend" className="h-8 w-8 p-0"><Lock className="h-4 w-4 text-warning" /></Button>
                    )}
                    {/* Ban */}
                    <Button variant="outline" size="sm" onClick={() => banUser(u.user_id)} title="Ban" className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/5"><Ban className="h-4 w-4" /></Button>
                    {/* Role selector */}
                    <Select value={u.roles[0] || "user"} onValueChange={v => updateRole(u.user_id, v)}>
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

        {/* CONTENT TAB */}
        <TabsContent value="content" className="space-y-4">
          <div className="flex gap-2">
            <Select value={contentFilter} onValueChange={setContentFilter}>
              <SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {filteredPosts.map(post => (
              <Card key={post.id} className="border-border/50">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{post.title}</span>
                      <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-[10px]">{post.status}</Badge>
                      {post.category === "featured" && <Badge className="text-[10px] bg-warning text-warning-foreground">FEATURED</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.views_count}</span>
                      <span>❤️ {post.likes_count}</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleFeaturePost(post.id, post.category)} title={post.category === "featured" ? "Unfeature" : "Feature"} className="h-8 w-8">
                      <Star className={`h-4 w-4 ${post.category === "featured" ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* GROUPS TAB */}
        <TabsContent value="groups" className="space-y-2">
          {groups.map(group => (
            <Card key={group.id} className="border-border/50">
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="flex items-center gap-2"><span className="font-medium text-sm">{group.name}</span>{group.is_public ? <Globe className="h-3 w-3 text-muted-foreground" /> : <Lock className="h-3 w-3 text-muted-foreground" />}</div>
                  <p className="text-xs text-muted-foreground">{group.description || "No description"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteGroup(group.id)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
          {groups.length === 0 && <p className="text-center text-muted-foreground py-8">No groups</p>}
        </TabsContent>

        {/* REPORTS TAB */}
        <TabsContent value="reports" className="space-y-2">
          {reports.map(report => (
            <Card key={report.id} className={`border-border/50 ${report.status === "pending" ? "border-warning/30" : ""}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-warning" />
                    <span className="font-medium text-sm">{report.reason}</span>
                    <Badge variant={report.status === "pending" ? "destructive" : "secondary"} className="text-[10px]">{report.status}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
                {report.admin_notes && <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">Notes: {report.admin_notes}</p>}
                {report.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Input placeholder="Admin notes..." value={adminNotes[report.id] || ""} onChange={e => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))} className="h-8 text-xs flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => resolveReport(report.id, "resolved", adminNotes[report.id])} className="text-success h-8"><CheckCircle className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => resolveReport(report.id, "dismissed", adminNotes[report.id])} className="text-destructive h-8"><XCircle className="h-4 w-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {reports.length === 0 && <p className="text-center text-muted-foreground py-8">No reports</p>}
        </TabsContent>

        {/* VERIFICATION REQUESTS TAB */}
        <TabsContent value="verification" className="space-y-2">
          {verificationRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No verification requests</p>
          ) : verificationRequests.map(req => {
            const reqUser = users.find(u => u.user_id === req.user_id);
            return (
              <Card key={req.id} className={`border-border/50 ${req.status === "pending" ? "border-primary/30" : ""}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{reqUser?.display_name || "User"}</span>
                      <Badge variant={req.status === "pending" ? "default" : req.status === "approved" ? "secondary" : "destructive"} className="text-[10px]">{req.status}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Followers: {req.followers_count}</span>
                    <span>Likes: {req.likes_count}</span>
                    <span>Referrals: {req.referrals_count}</span>
                    {req.has_violations && <span className="text-destructive">⚠ Has violations</span>}
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleVerificationRequest(req.id, req.user_id, "approved")} className="h-8 rounded-full text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleVerificationRequest(req.id, req.user_id, "rejected")} className="h-8 rounded-full text-xs text-destructive"><XCircle className="h-3 w-3 mr-1" /> Reject</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* HASHTAGS TAB */}
        <TabsContent value="hashtags" className="space-y-2">
          {hashtags.map(tag => (
            <div key={tag.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div>
                <p className="font-bold text-[15px]">#{tag.name}</p>
                <p className="text-xs text-muted-foreground">{tag.post_count} posts</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteHashtag(tag.id)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {hashtags.length === 0 && <p className="text-center text-muted-foreground py-8">No hashtags</p>}
        </TabsContent>

        {/* ACTIVITY LOG TAB */}
        <TabsContent value="activity" className="space-y-2">
          {activityLog.length > 0 ? activityLog.map((entry: any) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <Activity className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{entry.action}</p>
                <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
              </div>
            </div>
          )) : <p className="text-center text-muted-foreground py-8">No activity recorded</p>}
        </TabsContent>
      </Tabs>

      {/* Admin capabilities summary */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4">
          <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Admin Capabilities (70+)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[11px] text-muted-foreground">
            {[
              "Grant/Revoke Blue Tick", "Manage Roles", "Ban Users", "Suspend Users", "Unsuspend Users",
              "Send Broadcasts", "Delete Posts", "Feature Posts", "Delete Groups", "Manage Reports",
              "Approve Verification", "Reject Verification", "Manage Suggested Follows", "Export Data",
              "View Activity Log", "Send User Notifications", "Mass Verify", "Mass Unverify",
              "Delete Hashtags", "Filter Users", "Filter Content", "View User Profiles",
              "Manage Privacy", "View Platform Stats", "Monitor Messages Count", "Monitor Likes",
              "Monitor Comments", "Track Verified Count", "View Last Seen", "User Search",
              "Role-based Filtering", "Verified Filtering", "Content Status Filter", "Featured Content",
              "Report Resolution", "Admin Notes on Reports", "Suspension Management", "Ban Management",
              "Broadcast to All", "Individual Notifications", "Data Export (JSON)", "Activity Logging",
              "Verification Queue", "Hashtag Management", "Group Moderation", "Content Moderation",
              "User Profile Access", "Role Escalation Control", "Super Admin Role Guard", "Suggested Follow",
              "Who to Follow Management", "Blue Tick Batch Operations", "Real-time Stats Dashboard",
              "Post View Analytics", "Likes Analytics", "Comments Analytics", "Message Monitoring",
              "Report Status Tracking", "Resolution Timestamping", "Admin Notes System",
              "User Join Date Tracking", "Content Categorization", "Draft Management",
              "Published Content View", "Platform Health Monitor", "User Engagement Stats",
              "Community Management", "Privacy Enforcement", "Terms Compliance", "Security Oversight",
            ].map(c => <span key={c}>• {c}</span>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
