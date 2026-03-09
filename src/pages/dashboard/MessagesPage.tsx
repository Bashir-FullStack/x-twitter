import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";
import UserAvatar from "@/components/UserAvatar";
import {
  Send, MessageSquare, Search, User, ArrowLeft, Mail, MailPlus,
  Check, CheckCheck, Image, Smile, MoreHorizontal, Trash2, Pin,
  Phone, Video, Info, X, Paperclip, Mic, Reply, Forward,
  Copy, Star, Clock, Shield
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
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
  is_online?: boolean;
  is_admin?: boolean;
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

const EMOJI_LIST = ["😀","😂","🥲","😍","🤔","😎","🔥","💯","❤️","👍","👎","🎉","😢","😡","🤯","✨","💀","🙏","👀","💪","🥳","😴","🤝","🫡","💔","🙄","😏","🤗"];
const MESSAGE_REACTIONS = ["❤️","😂","👍","😮","😢","🔥"];

const MessagesPage = () => {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<{ display_name: string; avatar_url: string | null; is_verified: boolean; is_admin?: boolean } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; display_name: string; avatar_url: string | null; is_verified: boolean }>>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set());
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [searchMessages, setSearchMessages] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load admin user IDs
  useEffect(() => {
    supabase.from("user_roles").select("user_id, role").in("role", ["admin", "super_admin"]).then(({ data }) => {
      setAdminUserIds(new Set(data?.map(r => r.user_id) || []));
    });
  }, []);

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
        is_admin: adminUserIds.has(uid),
        is_online: Math.random() > 0.5, // Simulated
        pinned: false,
        ...userMap.get(uid)!,
      };
    });
    convs.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.last_time).getTime() - new Date(a.last_time).getTime();
    });
    setConversations(convs);
    setLoadingConvs(false);
  }, [user, adminUserIds]);

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

    const conv = conversations.find(c => c.user_id === selectedUser);
    if (conv) {
      setSelectedProfile({ display_name: conv.display_name, avatar_url: conv.avatar_url, is_verified: conv.is_verified, is_admin: adminUserIds.has(selectedUser) });
    } else {
      supabase.from("profiles").select("display_name, avatar_url, is_verified").eq("user_id", selectedUser).single().then(({ data }) => {
        if (data) setSelectedProfile({ ...data, is_admin: adminUserIds.has(selectedUser) });
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

  // Typing indicator simulation
  const handleTyping = () => {
    if (!isTyping) setIsTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
  };

  const sendMessage = async () => {
    if (!user || !selectedUser || !newMessage.trim()) return;
    const content = replyingTo ? `↩️ ${replyingTo.content.slice(0, 50)}${replyingTo.content.length > 50 ? '...' : ''}\n\n${newMessage.trim()}` : newMessage.trim();
    await supabase.from("messages").insert({ sender_id: user.id, receiver_id: selectedUser, content });
    setNewMessage("");
    setReplyingTo(null);
    setIsTyping(false);
    inputRef.current?.focus();
  };

  const deleteMessage = async (id: string) => {
    await supabase.from("messages").delete().eq("id", id);
    setMessages(prev => prev.filter(m => m.id !== id));
    toast({ title: "Message deleted" });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const forwardMessage = (content: string) => {
    setNewMessage(content);
    toast({ title: "Select a conversation to forward" });
  };

  const togglePin = (id: string) => {
    setPinnedMessages(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); toast({ title: "Unpinned" }); }
      else { n.add(id); toast({ title: "Pinned" }); }
      return n;
    });
  };

  const toggleStar = (id: string) => {
    setStarredMessages(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const addReaction = (msgId: string, emoji: string) => {
    setMessageReactions(prev => ({
      ...prev,
      [msgId]: [...(prev[msgId] || []).filter(e => e !== emoji), emoji]
    }));
    setShowReactionsFor(null);
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
    setFilteredMessages(null);
    setSearchMessages("");
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
      if (last?.date === dateStr) last.messages.push(msg);
      else groups.push({ date: dateStr, messages: [msg] });
    });
    return groups;
  };

  const handleSearchMessages = (q: string) => {
    setSearchMessages(q);
    if (!q.trim()) { setFilteredMessages(null); return; }
    setFilteredMessages(messages.filter(m => m.content.toLowerCase().includes(q.toLowerCase())));
  };

  const displayMessages = filteredMessages || messages;

  const isSenderAdmin = (senderId: string) => adminUserIds.has(senderId);

  return (
    <div className="flex h-[calc(100vh-53px)] lg:h-screen">
      {/* Conversations List */}
      <div className={`w-full lg:w-[380px] shrink-0 border-r border-border flex flex-col ${mobileShowChat ? "hidden lg:flex" : "flex"}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl font-bold">Messages</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => setShowSearch(!showSearch)}>
                <MailPlus className="h-5 w-5" />
              </Button>
            </div>
          </div>
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
          {searchResults.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground px-4 py-2">People</p>
              {searchResults.map((u) => (
                <button
                  key={u.user_id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                  onClick={() => selectConversation(u.user_id)}
                >
                  <UserAvatar avatarUrl={u.avatar_url} displayName={u.display_name} className="h-10 w-10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold truncate">{u.display_name || "User"}</span>
                      {u.is_verified && <VerifiedBadge className="h-4 w-4" />}
                      {adminUserIds.has(u.user_id) && <Shield className="h-3.5 w-3.5 text-success" />}
                    </div>
                  </div>
                </button>
              ))}
              <div className="border-b border-border" />
            </div>
          )}

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
              <p className="text-sm text-muted-foreground">Drop a line, share posts and more with private conversations.</p>
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
                <div className="relative">
                  <UserAvatar avatarUrl={conv.avatar_url} displayName={conv.display_name} className="h-12 w-12 shrink-0" />
                  {conv.is_online && (
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-success border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`text-[15px] truncate ${conv.unread > 0 ? "font-bold" : "font-medium"}`}>
                        {conv.display_name}
                      </span>
                      {conv.is_verified && <VerifiedBadge className="h-4 w-4 shrink-0" />}
                      {conv.is_admin && <Shield className="h-3.5 w-3.5 text-success shrink-0" />}
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
                      <span className="h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0 ml-auto">
                        {conv.unread}
                      </span>
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
                <UserAvatar avatarUrl={selectedProfile.avatar_url} displayName={selectedProfile.display_name} className="h-9 w-9" />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[15px]">{selectedProfile.display_name}</span>
                    {selectedProfile.is_verified && <VerifiedBadge className="h-4 w-4" />}
                    {selectedProfile.is_admin && <Shield className="h-3.5 w-3.5 text-success" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {otherTyping ? "typing..." : selectedProfile.is_admin ? "Admin" : "Active"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {/* Search in conversation */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem className="gap-2">
                      <Search className="h-4 w-4" /> Search in conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Star className="h-4 w-4" /> Starred messages
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Pin className="h-4 w-4" /> Pinned messages
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-destructive">
                      <Trash2 className="h-4 w-4" /> Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Pinned messages bar */}
            {Array.from(pinnedMessages).filter(id => messages.some(m => m.id === id)).length > 0 && (
              <div className="px-4 py-2 bg-warning/10 border-b border-warning/20 flex items-center gap-2 text-xs">
                <Pin className="h-3.5 w-3.5 text-warning" />
                <span className="text-warning font-medium">{pinnedMessages.size} pinned message(s)</span>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-1">
                {/* Profile card at top */}
                <div className="flex flex-col items-center py-8 mb-4">
                  <UserAvatar avatarUrl={selectedProfile.avatar_url} displayName={selectedProfile.display_name} className="h-16 w-16 mb-3" />
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-lg">{selectedProfile.display_name}</span>
                    {selectedProfile.is_verified && <VerifiedBadge className="h-5 w-5" />}
                    {selectedProfile.is_admin && (
                      <span className="ml-1 text-[10px] font-bold bg-success/20 text-success px-2 py-0.5 rounded-full">ADMIN</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">This is the beginning of your conversation.</p>
                  {selectedProfile.is_admin && (
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Official admin account
                    </p>
                  )}
                </div>

                {groupMessagesByDate(displayMessages).map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">{group.date}</span>
                    </div>
                    {group.messages.map((msg, i) => {
                      const isMine = msg.sender_id === user?.id;
                      const senderIsAdmin = isSenderAdmin(msg.sender_id);
                      const nextMsg = group.messages[i + 1];
                      const prevMsg = group.messages[i - 1];
                      const showTime = !nextMsg || nextMsg.sender_id !== msg.sender_id ||
                        new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() > 60000;
                      const isFirst = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                      const isPinned = pinnedMessages.has(msg.id);
                      const isStarred = starredMessages.has(msg.id);
                      const reactions = messageReactions[msg.id] || [];
                      const isReply = msg.content.startsWith("↩️");

                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group mb-0.5 ${isPinned ? "relative" : ""}`}>
                          {/* Show avatar for other person's first message in a group */}
                          {!isMine && isFirst && (
                            <UserAvatar avatarUrl={selectedProfile?.avatar_url || null} displayName={selectedProfile?.display_name || ""} className="h-8 w-8 shrink-0 mr-2 mt-1 self-end" />
                          )}
                          {!isMine && !isFirst && <div className="w-8 mr-2 shrink-0" />}
                          
                          <div className="relative max-w-[75%]">
                            {/* Pinned indicator */}
                            {isPinned && (
                              <div className={`flex items-center gap-1 mb-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                                <Pin className="h-3 w-3 text-warning" />
                                <span className="text-[10px] text-warning">Pinned</span>
                              </div>
                            )}

                            <div
                              className={`rounded-2xl px-4 py-2.5 text-[15px] leading-[20px] relative ${
                                isMine
                                  ? senderIsAdmin
                                    ? "bg-success text-success-foreground rounded-br-md"
                                    : "bg-primary text-primary-foreground rounded-br-md"
                                  : senderIsAdmin
                                    ? "bg-success/15 text-foreground rounded-bl-md border border-success/30"
                                    : "bg-muted rounded-bl-md"
                              }`}
                            >
                              {/* Admin badge on message */}
                              {senderIsAdmin && !isMine && isFirst && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Shield className="h-3 w-3 text-success" />
                                  <span className="text-[10px] font-bold text-success">ADMIN</span>
                                </div>
                              )}
                              
                              {/* Reply preview */}
                              {isReply && (
                                <div className={`text-[11px] mb-1 pb-1 border-b ${
                                  isMine ? "border-white/20 text-white/70" : "border-border text-muted-foreground"
                                }`}>
                                  <Reply className="h-3 w-3 inline mr-1" />
                                  {msg.content.split("\n\n")[0].replace("↩️ ", "")}
                                </div>
                              )}
                              
                              {isReply ? msg.content.split("\n\n").slice(1).join("\n\n") : msg.content}
                              
                              {isStarred && (
                                <Star className={`h-3 w-3 inline ml-1 ${isMine ? "text-yellow-200" : "text-warning"} fill-current`} />
                              )}
                            </div>

                            {/* Reactions */}
                            {reactions.length > 0 && (
                              <div className={`flex gap-0.5 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                                {reactions.map((emoji, i) => (
                                  <span key={i} className="text-sm bg-muted rounded-full px-1.5 py-0.5 border border-border cursor-pointer hover:bg-muted/80">
                                    {emoji}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Time & read status */}
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

                            {/* Reaction picker */}
                            {showReactionsFor === msg.id && (
                              <div className={`absolute ${isMine ? "right-0" : "left-0"} -top-10 bg-background border border-border rounded-full px-2 py-1 flex gap-1 shadow-lg z-10`}>
                                {MESSAGE_REACTIONS.map(emoji => (
                                  <button key={emoji} onClick={() => addReaction(msg.id, emoji)} className="text-sm hover:scale-125 transition-transform p-0.5">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Message actions on hover */}
                            <div className={`absolute ${isMine ? "-left-28" : "-right-28"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-background border border-border rounded-lg shadow-sm p-0.5`}>
                              <button onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="React">
                                <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button onClick={() => setReplyingTo(msg)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Reply">
                                <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="p-1.5 rounded hover:bg-muted transition-colors">
                                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isMine ? "start" : "end"} className="w-44">
                                  <DropdownMenuItem onClick={() => copyMessage(msg.content)} className="gap-2 text-xs">
                                    <Copy className="h-3.5 w-3.5" /> Copy
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => togglePin(msg.id)} className="gap-2 text-xs">
                                    <Pin className="h-3.5 w-3.5" /> {isPinned ? "Unpin" : "Pin"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleStar(msg.id)} className="gap-2 text-xs">
                                    <Star className="h-3.5 w-3.5" /> {isStarred ? "Unstar" : "Star"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => forwardMessage(msg.content)} className="gap-2 text-xs">
                                    <Forward className="h-3.5 w-3.5" /> Forward
                                  </DropdownMenuItem>
                                  {isMine && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => deleteMessage(msg.id)} className="gap-2 text-xs text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Typing indicator */}
                {otherTyping && (
                  <div className="flex justify-start mb-1">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Reply bar */}
            {replyingTo && (
              <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center gap-2">
                <Reply className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-primary font-medium">Replying to message</p>
                  <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
                </div>
                <button onClick={() => setReplyingTo(null)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t border-border p-3">
              {/* Emoji picker */}
              {showEmojis && (
                <div className="mb-2 p-2 bg-muted rounded-xl flex flex-wrap gap-1">
                  {EMOJI_LIST.map(emoji => (
                    <button key={emoji} onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojis(false); inputRef.current?.focus(); }} className="text-lg p-1 hover:bg-background rounded-lg transition-colors">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2 bg-muted rounded-2xl px-3 py-2">
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-primary hover:bg-primary/10">
                    <Image className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-primary hover:bg-primary/10" onClick={() => setShowEmojis(!showEmojis)}>
                    <Smile className="h-5 w-5" />
                  </Button>
                </div>
                <Input
                  ref={inputRef}
                  placeholder="Start a new message"
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  className="border-0 bg-transparent focus-visible:ring-0 px-1 text-[15px]"
                />
                {newMessage.trim() ? (
                  <Button
                    onClick={sendMessage}
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-9 w-9 shrink-0 text-primary hover:bg-primary/10"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0 text-muted-foreground">
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
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

export default MessagesPage;
