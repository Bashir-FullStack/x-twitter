import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/UserAvatar";
import { Plus, Users, Globe, Lock, ArrowLeft, Search, Send, Smile } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

interface GroupMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: { display_name: string | null; avatar_url: string | null };
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
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Load messages + realtime when entering a group
  useEffect(() => {
    if (!activeGroup) return;
    let channel: any;
    const load = async () => {
      const { data } = await supabase.from("messages").select("*").eq("group_id", activeGroup.id).order("created_at", { ascending: true }).limit(200);
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", senderIds.length ? senderIds : ["00000000-0000-0000-0000-000000000000"]);
      const map = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setMessages((data || []).map(m => ({ ...m, sender: map.get(m.sender_id) as any })));
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    };
    load();
    channel = supabase.channel(`group-chat-${activeGroup.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${activeGroup.id}` }, async (payload) => {
        const m = payload.new as any;
        const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", m.sender_id).maybeSingle();
        setMessages(prev => [...prev, { ...m, sender: profile as any }]);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeGroup?.id]);

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

  const joinGroup = async (group: Group) => {
    if (!user) return;
    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id });
    toast({ title: `Joined ${group.name}` });
    fetchGroups();
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    toast({ title: "Left community" });
    if (activeGroup?.id === groupId) setActiveGroup(null);
    fetchGroups();
  };

  const sendMessage = async () => {
    if (!user || !activeGroup || !draft.trim()) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, group_id: activeGroup.id, content: text });
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); setDraft(text); }
    setSending(false);
  };

  const myGroups = groups.filter(g => g.is_member);
  const discoverGroups = groups.filter(g => !g.is_member && g.is_public);
  const filtered = searchQuery
    ? groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : (tab === "yours" ? myGroups : discoverGroups);

  const timeFmt = (d: string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ====== ACTIVE GROUP CHAT VIEW ======
  if (activeGroup) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0 flex flex-col animate-fade-in">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border h-[53px] flex items-center px-4 gap-3">
          <button onClick={() => setActiveGroup(null)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {activeGroup.is_public ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] truncate">{activeGroup.name}</p>
            <p className="text-[12px] text-muted-foreground">{activeGroup.member_count} members</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => leaveGroup(activeGroup.id)}>Leave</Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[60vh]">
          {messages.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">Be the first to say hi 👋</div>
          ) : messages.map((m, i) => {
            const mine = m.sender_id === user?.id;
            const prev = messages[i - 1];
            const sameSender = prev?.sender_id === m.sender_id;
            return (
              <div key={m.id} className={`flex gap-2 animate-fade-in ${mine ? "flex-row-reverse" : ""}`}>
                {!mine && !sameSender ? (
                  <UserAvatar avatarUrl={m.sender?.avatar_url} displayName={m.sender?.display_name} className="h-8 w-8 shrink-0" />
                ) : <div className="w-8 shrink-0" />}
                <div className={`max-w-[75%] ${mine ? "items-end" : ""}`}>
                  {!sameSender && !mine && <p className="text-[11px] text-muted-foreground mb-0.5 ml-1">{m.sender?.display_name || "User"}</p>}
                  <div className={`px-3.5 py-2 rounded-2xl text-[15px] break-words ${mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                    {m.content}
                  </div>
                  <p className={`text-[10px] text-muted-foreground mt-0.5 ${mine ? "text-right mr-1" : "ml-1"}`}>{timeFmt(m.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background p-3 flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message the community…"
            rows={1}
            className="flex-1 resize-none rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary min-h-[44px] max-h-32"
          />
          <Button onClick={sendMessage} disabled={!draft.trim() || sending} size="icon" className="rounded-full gradient-primary text-primary-foreground h-11 w-11 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ====== LIST VIEW ======
  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-[53px]">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="font-display text-xl font-bold">Communities</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><Plus className="h-5 w-5" /></Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create Community</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <Input placeholder="Community name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" />
                <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="resize-none" />
                <div className="flex items-center justify-between"><Label>Public community</Label><Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} /></div>
                <Button onClick={createGroup} className="w-full rounded-full gradient-primary text-primary-foreground font-bold h-11">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search communities" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-10" />
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
            <TabsTrigger value="discover" className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">Discover</TabsTrigger>
            <TabsTrigger value="yours" className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">Your Communities</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="divide-y divide-border">{[1,2,3].map(i => (<div key={i} className="flex gap-3 p-4 animate-pulse"><div className="h-12 w-12 rounded-xl bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-32 bg-muted rounded" /><div className="h-3 w-48 bg-muted rounded" /></div></div>))}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 px-8 animate-fade-in">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl mb-1">{tab === "yours" ? "No communities yet" : "No communities to discover"}</h2>
          <p className="text-[15px] text-muted-foreground">{tab === "yours" ? "Join a community or create your own." : "Check back later for new communities."}</p>
        </div>
      ) : (
        <div className="animate-fade-in">
          {filtered.map((group) => (
            <div key={group.id} className="flex items-center gap-3 px-4 py-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => group.is_member ? setActiveGroup(group) : null}>
              <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                {group.is_public ? <Globe className="h-6 w-6 text-primary" /> : <Lock className="h-6 w-6 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px]">{group.name}</p>
                <p className="text-[13px] text-muted-foreground line-clamp-1">{group.description || "No description"}</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">{group.member_count} members · {group.is_public ? "Public" : "Private"}</p>
              </div>
              {group.is_member ? (
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-full text-[13px] font-bold bg-foreground text-background hover:bg-foreground/90" onClick={(e) => { e.stopPropagation(); setActiveGroup(group); }}>Open chat</Button>
                </div>
              ) : (
                <Button size="sm" className="rounded-full text-[13px] font-bold bg-foreground text-background hover:bg-foreground/90" onClick={(e) => { e.stopPropagation(); joinGroup(group); }}>Join</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
