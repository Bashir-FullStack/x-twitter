import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle, Shield, Settings } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Info> = { info: Info, warning: AlertTriangle, success: CheckCircle, error: XCircle, system: Settings, security: Shield };
const typeColors: Record<string, string> = { info: "text-primary", warning: "text-warning", success: "text-success", error: "text-destructive", system: "text-muted-foreground", security: "text-destructive" };

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch_();
    if (!user) return;
    const channel = supabase.channel("notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
      setNotifications((prev) => [payload.new as Notification, ...prev]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => { await supabase.from("notifications").update({ is_read: true }).eq("id", id); fetch_(); };
  const markAllRead = async () => { if (!user) return; await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false); fetch_(); };
  const deleteNotif = async (id: string) => { await supabase.from("notifications").delete().eq("id", id); fetch_(); };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}><CheckCheck className="mr-2 h-4 w-4" /> Mark all read</Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : notifications.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No notifications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <Card key={n.id} className={`border-border/50 transition-colors ${!n.is_read ? "bg-primary/5 border-primary/20" : ""}`}>
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${typeColors[n.type] || "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.is_read && <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>}
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1">
                    {!n.is_read && <Button variant="ghost" size="icon" onClick={() => markRead(n.id)}><Check className="h-4 w-4" /></Button>}
                    <Button variant="ghost" size="icon" onClick={() => deleteNotif(n.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
