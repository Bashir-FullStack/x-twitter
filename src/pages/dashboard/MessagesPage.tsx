import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  Send, MessageSquare, Search, User, ArrowLeft, Mail, MailPlus,
  Check, CheckCheck, Image, Smile, MoreHorizontal, Trash2, Pin,
  Phone, Video, Info, X, Paperclip, Mic
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Conversation {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  last_message: string;
  last_time: string;
  unread: number;
  pinned: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  content: string;
  is_read: boolean;
  is_edited: boolean;
  message_type: string;
  created_at: string;
}

const MessagesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<{ display_name: string; avatar_url: string | null; is_verified: boolean } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; display_name: string; avatar_url: string | null; is_verified: boolean }>>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
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
    if (userIds.length === 0) { setConversations([]); setLoadingConvs(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, is_verified").in("user_id", userIds);

    const convs: Conversation[] = userIds.map((uid) => {
      const p = profiles?.find((p) => p.user_id === uid);
      return {
        user_id: uid,
        display_name: p?.display_name || "User",
        avatar_url: p?.avatar_url || null,
        is_verified: p?.is_verified || false,
        pinned: false,
        ...userMap.get(uid)!,
      };
    });
    convs.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
    setConversations(convs);
    setLoadingConvs(false);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages for selected user
  useEffect(() => {
    if (!user || !selectedUser) return;
    const loadMessages = async () => {
      const { data } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);
      await supabase.from("messages").update({ is_read: true }).eq("sender_id", selectedUser).eq("receiver_id", user.id).eq("is_read", false);
      loadConversations();
    };
    loadMessages();

    // Get selected profile
    const conv = conversations.find(c => c.user_id === selectedUser);
    if (conv) {
      setSelectedProfile({ display_name: conv.display_name, avatar_url: conv.avatar_url, is_verified: conv.is_verified });
    } else {
      supabase.from("profiles").select("display_name, avatar_url, is_verified").eq("user_id", selectedUser).single().then(({ data }) => {
        if (data) setSelectedProfile(data);
      });
    }

    const channel = supabase.channel(`messages-${selectedUser}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const msg = payload.new as Message;
      if ((msg.sender_id === user.id && msg.receiver_id === selectedUser) || (msg.sender_id === selectedUser && msg.receiver_id === user.id)) {
        setMessages((prev) => [...prev, msg]);
        if (msg.sender_id === selectedUser) {
          supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
        }
      }
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedUser]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!user || !selectedUser || !newMessage.trim()) return;
    await supabase.from("messages").insert({ sender_id: user.id, receiver_id: selectedUser, content: newMessage.trim() });
    setNewMessage("");
    inputRef.current?.focus();
  };

  const deleteMessage = async (id: string) => {
    await supabase.from("messages").delete().eq("id", id);
    setMessages(prev => prev.filter(m => m.id !== id));
    toast({ title: "Message deleted" });
  };

  const searchUsers = async (q: string) => {
    setSearchUser(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url, is_verified").ilike("display_name", `%${q}%`).neq("user_id", user?.id).limit(10);
    setSearchResults(data || []);
  };

  const selectConversation = (userId: string) => {
    setSelectedUser(userId);
    setMobileShowChat(true);
    setShowSearch(false);
    setSearchUser("");
    setSearchResults([]);
  };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 604800) return `${Math.floor(s / 86400)}d`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    msgs.forEach(msg => {
      const dateStr = new Date(msg.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      const last = groups[groups.length - 1];
      if (last?.date === dateStr) {
        last.messages.push(msg);
      } else {
        groups.push({ date: dateStr, messages: [msg] });
      }
    });
    return groups;
  };

  return (
    <div className="flex h-[calc(100vh-53px)] lg:h-screen">
      {/* Conversations List */}
      <div className={`w-full lg:w-[380px] shrink-0 border-r border-border flex flex-col ${mobileShowChat ? "hidden lg:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl font-bold">Messages</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => setShowSearch(!showSearch)}>
                <MailPlus className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Direct Messages"
              value={searchUser}
              onChange={(e) => searchUsers(e.target.value)}
              className="pl-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-10"
              onFocus={() => setShowSearch(true)}
            />
            {searchUser && (
              <button onClick={() => { setSearchUser(""); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground px-4 py-2">People</p>
              {searchResults.map((u) => (
                <button
                  key={u.user_id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                  onClick={() => selectConversation(u.user_id)}
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {u.display_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold truncate">{u.display_name || "User"}</span>
                      {u.is_verified && <VerifiedBadge className="h-4 w-4" />}
                    </div>
                  </div>
                </button>
              ))}
              <div className="border-b border-border" />
            </div>
          )}

          {/* Conversations */}
          {loadingConvs ? (
            <div className="space-y-0">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-28 bg-muted rounded" />
                    <div className="h-3 w-40 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 && searchResults.length === 0 ? (
            <div className="flex flex-col items-center py-16 px-8 text-center">
              <Mail className="h-12 w-12 text-primary mb-4" />
              <h2 className="font-display font-bold text-xl mb-2">Welcome to your inbox!</h2>
              <p className="text-sm text-muted-foreground">Drop a line, share posts and more with private conversations between you and others.</p>
              <Button className="mt-6 rounded-full gradient-primary text-primary-foreground font-bold px-6" onClick={() => setShowSearch(true)}>
                Write a message
              </Button>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.user_id}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selectedUser === conv.user_id ? "bg-muted/70" : "hover:bg-muted/30"
                }`}
                onClick={() => selectConversation(conv.user_id)}
              >
                <div className="h-12 w-12 shrink-0 rounded-full bg-muted flex items-center justify-center text-sm font-semibold relative">
                  {conv.display_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`text-[15px] truncate ${conv.unread > 0 ? "font-bold" : "font-medium"}`}>
                        {conv.display_name}
                      </span>
                      {conv.is_verified && <VerifiedBadge className="h-4 w-4 shrink-0" />}
                    </div>
                    <span className={`text-xs shrink-0 ml-2 ${conv.unread > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {timeAgo(conv.last_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className={`text-[13px] truncate ${conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {conv.last_message}
                    </p>
                    {conv.unread > 0 && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 ml-auto" />
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${!mobileShowChat && !selectedUser ? "hidden lg:flex" : "flex"} ${mobileShowChat ? "flex" : !selectedUser ? "" : ""}`}>
        {selectedUser && selectedProfile ? (
          <>
            {/* Chat Header */}
            <div className="h-[53px] border-b border-border flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => { setMobileShowChat(false); }} className="lg:hidden text-foreground mr-1">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                  {selectedProfile.display_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[15px]">{selectedProfile.display_name}</span>
                    {selectedProfile.is_verified && <VerifiedBadge className="h-4 w-4" />}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <Info className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-1">
                {/* Profile card at top */}
                <div className="flex flex-col items-center py-8 mb-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold mb-3">
                    {selectedProfile.display_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-lg">{selectedProfile.display_name}</span>
                    {selectedProfile.is_verified && <VerifiedBadge className="h-5 w-5" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">This is the beginning of your conversation.</p>
                </div>

                {groupMessagesByDate(messages).map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-background px-3 py-1">{group.date}</span>
                    </div>
                    {group.messages.map((msg, i) => {
                      const isMine = msg.sender_id === user?.id;
                      const nextMsg = group.messages[i + 1];
                      const showTime = !nextMsg || nextMsg.sender_id !== msg.sender_id ||
                        new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() > 60000;

                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group mb-0.5`}>
                          <div className="relative max-w-[75%]">
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-[15px] leading-[20px] ${
                                isMine
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md"
                              }`}
                            >
                              {msg.content}
                            </div>
                            {showTime && (
                              <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                <span className="text-[11px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                                {isMine && (
                                  msg.is_read
                                    ? <CheckCheck className="h-3 w-3 text-primary" />
                                    : <Check className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            {/* Delete on hover for own messages */}
                            {isMine && (
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2 bg-muted rounded-2xl px-3 py-2">
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-primary hover:bg-primary/10">
                    <Image className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-primary hover:bg-primary/10">
                    <Smile className="h-5 w-5" />
                  </Button>
                </div>
                <Input
                  ref={inputRef}
                  placeholder="Start a new message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  className="border-0 bg-transparent focus-visible:ring-0 px-1 text-[15px]"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  variant="ghost"
                  size="icon"
                  className={`rounded-full h-9 w-9 shrink-0 ${newMessage.trim() ? "text-primary hover:bg-primary/10" : "text-muted-foreground"}`}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-8">
            <h2 className="font-display text-3xl font-bold mb-2">Select a message</h2>
            <p className="text-muted-foreground text-[15px] text-center max-w-sm mb-6">
              Choose from your existing conversations, start a new one, or just keep swimming.
            </p>
            <Button className="rounded-full gradient-primary text-primary-foreground font-bold px-8 h-[52px] text-[17px] shadow-glow" onClick={() => setShowSearch(true)}>
              New message
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Needed for the Settings icon in the header
const Settings = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default MessagesPage;
