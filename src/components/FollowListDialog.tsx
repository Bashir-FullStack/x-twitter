import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface FollowUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  bio: string | null;
  isFollowing: boolean;
}

interface FollowListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: "followers" | "following";
  title: string;
}

const FollowListDialog = ({ open, onOpenChange, userId, type, title }: FollowListDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    loadUsers();
  }, [open, userId, type]);

  const loadUsers = async () => {
    setLoading(true);
    let userIds: string[] = [];

    if (type === "followers") {
      const { data } = await supabase.from("follows").select("follower_id").eq("following_id", userId);
      userIds = data?.map(f => f.follower_id) || [];
    } else {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
      userIds = data?.map(f => f.following_id) || [];
    }

    if (userIds.length === 0) { setUsers([]); setLoading(false); return; }

    const { data: profiles } = await supabase.from("profiles")
      .select("user_id, display_name, avatar_url, is_verified, bio")
      .in("user_id", userIds);

    // Check which ones current user follows
    let myFollowingSet = new Set<string>();
    if (user) {
      const { data: myFollows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      myFollowingSet = new Set(myFollows?.map(f => f.following_id) || []);
    }

    setUsers((profiles || []).map(p => ({
      ...p,
      isFollowing: myFollowingSet.has(p.user_id),
    })));
    setLoading(false);
  };

  const toggleFollow = async (targetId: string, currentlyFollowing: boolean) => {
    if (!user) return;
    if (currentlyFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
    }
    setUsers(prev => prev.map(u => u.user_id === targetId ? { ...u, isFollowing: !currentlyFollowing } : u));
  };

  const filtered = users.filter(u => !search || u.display_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 rounded-full bg-muted border-0 h-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {search ? "No results" : `No ${type} yet`}
            </p>
          ) : (
            <div className="pb-4">
              {filtered.map(u => (
                <div key={u.user_id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <UserAvatar
                    avatarUrl={u.avatar_url}
                    displayName={u.display_name}
                    className="h-10 w-10 shrink-0"
                    onClick={() => { onOpenChange(false); navigate(`/dashboard/user/${u.user_id}`); }}
                  />
                  <div className="flex-1 min-w-0" onClick={() => { onOpenChange(false); navigate(`/dashboard/user/${u.user_id}`); }}>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm truncate hover:underline cursor-pointer">{u.display_name || "User"}</span>
                      {u.is_verified && <VerifiedBadge className="h-4 w-4 shrink-0" />}
                    </div>
                    {u.bio && <p className="text-xs text-muted-foreground truncate">{u.bio}</p>}
                  </div>
                  {user && u.user_id !== user.id && (
                    <Button
                      variant={u.isFollowing ? "outline" : "default"}
                      size="sm"
                      className="rounded-full text-xs h-8 font-bold shrink-0"
                      onClick={() => toggleFollow(u.user_id, u.isFollowing)}
                    >
                      {u.isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FollowListDialog;
