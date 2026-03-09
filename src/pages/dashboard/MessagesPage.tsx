import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Search, User } from "lucide-react";

interface Conversation {
  user_id: string;
  display_name: string;
  last_message: string;
  last_time: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const MessagesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; display_name: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    const loadConversations = async () => {
      const { data: sent } = await supabase.from("messages").select("receiver_id, content, created_at, is_read").eq("sender_id", user.id).order("created_at", { ascending: false });
      const { data: received } = await supabase.from("messages").select("sender_id, content, created_at, is_read").eq("receiver_id", user.id).order("created_at", { ascending: false });
      
      const userMap = new Map<string, { last_message: string; last_time: string; unread: number }>();
      sent?.forEach((m) => {
        const uid = m.receiver_id!;
        if (!userMap.has(uid)) userMap.set(uid, { last_message: m.content, last_time: m.created_at, unread: 0 });
      });
      received?.forEach((m) => {
        const uid = m.sender_id;
        const existing = userMap.get(uid);
        if (!existing || m.created_at > existing.last_time) {
          userMap.set(uid, { last_message: m.content, last_time: m.created_at, unread: (existing?.unread || 0) + (!m.is_read ? 1 : 0) });
        } else if (!m.is_read) {
          existing.unread++;
        }
      });

      const userIds = Array.from(userMap.keys());
      if (userIds.length === 0) { setConversations([]); return; }
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      
      const convs: Conversation[] = userIds.map((uid) => ({
        user_id: uid,
        display_name: profiles?.find((p) => p.user_id === uid)?.display_name || "User",
        ...userMap.get(uid)!,
      }));
      convs.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
      setConversations(convs);
    };
    loadConversations();
  }, [user]);

  // Load messages for selected user
  useEffect(() => {
    if (!user || !selectedUser) return;
    const loadMessages = async () => {
      const { data } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);
      // Mark as read
      await supabase.from("messages").update({ is_read: true }).eq("sender_id", selectedUser).eq("receiver_id", user.id).eq("is_read", false);
    };
    loadMessages();

    // Realtime subscription
    const channel = supabase.channel(`messages-${selectedUser}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const msg = payload.new as Message;
      if ((msg.sender_id === user.id && msg.receiver_id === selectedUser) || (msg.sender_id === selectedUser && msg.receiver_id === user.id)) {
        setMessages((prev) => [...prev, msg]);
      }
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedUser]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!user || !selectedUser || !newMessage.trim()) return;
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: selectedUser, content: newMessage.trim() });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewMessage("");
  };

  const searchUsers = async () => {
    if (!searchUser.trim()) return;
    const { data } = await supabase.from("profiles").select("user_id, display_name").ilike("display_name", `%${searchUser}%`).neq("user_id", user?.id).limit(10);
    setSearchResults(data || []);
  };

  return (
    <div className="animate-fade-in h-[calc(100vh-8rem)]">
      <h1 className="font-display text-2xl font-bold mb-4">Messages</h1>
      <div className="flex h-[calc(100%-3rem)] gap-4">
        {/* Sidebar */}
        <Card className="w-80 shrink-0 border-border/50 flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="flex gap-2">
              <Input placeholder="Search users..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchUsers()} />
              <Button variant="ghost" size="icon" onClick={searchUsers}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {searchResults.length > 0 && (
              <div className="p-2 border-b border-border">
                <p className="text-xs text-muted-foreground px-2 mb-1">Search Results</p>
                {searchResults.map((u) => (
                  <button key={u.user_id} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left" onClick={() => { setSelectedUser(u.user_id); setSearchResults([]); setSearchUser(""); }}>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
                    <span className="text-sm font-medium truncate">{u.display_name || "User"}</span>
                  </button>
                ))}
              </div>
            )}
            {conversations.map((conv) => (
              <button key={conv.user_id} className={`w-full flex items-center gap-3 px-3 py-3 border-b border-border/50 text-left transition-colors ${selectedUser === conv.user_id ? "bg-muted" : "hover:bg-muted/50"}`} onClick={() => setSelectedUser(conv.user_id)}>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-5 w-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate">{conv.display_name}</span>
                    {conv.unread > 0 && <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{conv.unread}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                </div>
              </button>
            ))}
            {conversations.length === 0 && searchResults.length === 0 && (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Search for a user to start chatting</p>
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat area */}
        <Card className="flex-1 border-border/50 flex flex-col">
          {selectedUser ? (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                <span className="font-medium">{conversations.find((c) => c.user_id === selectedUser)?.display_name || "User"}</span>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${msg.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {msg.content}
                        <div className={`text-[10px] mt-1 ${msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border flex gap-2">
                <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
                <Button onClick={sendMessage} className="gradient-primary text-primary-foreground"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Select a conversation or search for a user</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MessagesPage;
