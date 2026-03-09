import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle,
  XCircle, Shield, Settings as SettingsIcon, Heart, MessageCircle, Repeat2, UserPlus,
  AtSign, MoreHorizontal, Filter
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10" },
  like: { icon: Heart, color: "text-destructive", bg: "bg-destructive/10" },
  comment: { icon: MessageCircle, color: "text-primary", bg: "bg-primary/10" },
  repost: { icon: Repeat2, color: "text-success", bg: "bg-success/10" },
  follow: { icon: UserPlus, color: "text-primary", bg: "bg-primary/10" },
  mention: { icon: AtSign, color: "text-primary", bg: "bg-primary/10" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  success: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  error: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  system: { icon: SettingsIcon, color: "text-muted-foreground", bg: "bg-muted" },
  security: { icon: Shield, color: "text-destructive", bg: "bg-destructive/10" },
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const fetch_ = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch_();
    if (!user) return;
    const channel = supabase.channel("notifications-page").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
      setNotifications((prev) => [payload.new as Notification, ...prev]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => { await supabase.from("notifications").update({ is_read: true }).eq("id", id); fetch_(); };
  const markAllRead = async () => { if (!user) return; await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false); fetch_(); };
  const deleteNotif = async (id: string) => { await supabase.from("notifications").delete().eq("id", id); fetch_(); };
  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) { await supabase.from("notifications").delete().eq("id", id); }
    setSelectedIds(new Set());
    setSelectMode(false);
    fetch_();
  };
  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = tab === "all" ? notifications
    : tab === "mentions" ? notifications.filter(n => n.type === "mention" || n.type === "comment")
    : tab === "likes" ? notifications.filter(n => n.type === "like")
    : tab === "follows" ? notifications.filter(n => n.type === "follow")
    : notifications.filter(n => n.type !== "mention" && n.type !== "comment");

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-[53px]">
          <h1 className="font-display text-xl font-bold">Notifications</h1>
          <div className="flex items-center gap-1">
            {selectMode && selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={deleteSelected} className="text-destructive text-xs rounded-full">
                Delete ({selectedIds.size})
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><MoreHorizontal className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {unreadCount > 0 && (
                  <DropdownMenuItem onClick={markAllRead} className="gap-2"><CheckCheck className="h-4 w-4" /> Mark all as read</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setSelectMode(!selectMode)} className="gap-2">
                  <Filter className="h-4 w-4" /> {selectMode ? "Cancel selection" : "Select notifications"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearAll} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Clear all notifications</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border overflow-x-auto">
            {[
              { value: "all", label: "All" },
              { value: "mentions", label: "Mentions" },
              { value: "likes", label: "Likes" },
              { value: "follows", label: "Follows" },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-3 p-4 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-3.5 w-48 bg-muted rounded" /><div className="h-3 w-64 bg-muted rounded" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 px-8 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <h2 className="font-display font-bold text-xl mb-1">Nothing to see here — yet</h2>
          <p className="text-sm text-muted-foreground">{tab === "mentions" ? "When someone mentions you, you'll find it here." : tab === "likes" ? "When someone likes your post, you'll see it here." : tab === "follows" ? "New followers will appear here." : "When there is activity, you'll see it here."}</p>
        </div>
      ) : (
        <div>
          {filtered.map((n) => {
            const config = typeConfig[n.type] || typeConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${!n.is_read ? "bg-primary/[0.03]" : ""} ${selectedIds.has(n.id) ? "bg-primary/10" : ""}`}
                onClick={() => {
                  if (selectMode) { toggleSelect(n.id); return; }
                  if (!n.is_read) markRead(n.id);
                  if (n.link) navigate(n.link);
                }}
              >
                {selectMode && (
                  <div className="flex items-center shrink-0">
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${selectedIds.has(n.id) ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                      {selectedIds.has(n.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </div>
                )}
                <div className={`h-9 w-9 shrink-0 rounded-full ${config.bg} flex items-center justify-center mt-0.5`}>
                  <Icon className={`h-[18px] w-[18px] ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] leading-[20px] ${!n.is_read ? "font-medium" : ""}`}>{n.title}</p>
                  {n.body && <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
                  {!selectMode && (
                    <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
