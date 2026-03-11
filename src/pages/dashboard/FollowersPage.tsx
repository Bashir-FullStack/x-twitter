import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useToast } from "@/hooks/use-toast";

const FollowersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [frs, fng] = await Promise.all([
        supabase.from("follows").select("follower_id").eq("following_id", user.id),
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
      ]);
      const followerIds = frs.data?.map(f => f.follower_id) || [];
      const followingIds = fng.data?.map(f => f.following_id) || [];
      setFollowingSet(new Set(followingIds));
      const allIds = [...new Set([...followerIds, ...followingIds])];
      if (allIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, bio, is_verified").in("user_id", allIds);
        const profileMap = Object.fromEntries(profiles?.map(p => [p.user_id, p]) || []);
        setFollowers(followerIds.map(id => profileMap[id]).filter(Boolean));
        setFollowing(followingIds.map(id => profileMap[id]).filter(Boolean));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const toggleFollow = async (userId: string) => {
    if (!user) return;
    if (followingSet.has(userId)) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setFollowingSet(prev => { const n = new Set(prev); n.delete(userId); return n; });
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      setFollowingSet(prev => new Set(prev).add(userId));
      toast({ title: "Followed!" });
    }
  };

  const UserRow = ({ u }: { u: any }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/user/${u.user_id}`)}>
      <UserAvatar avatarUrl={u.avatar_url} displayName={u.display_name} className="h-10 w-10 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1"><span className="font-bold text-[15px]">{u.display_name || "User"}</span>{u.is_verified && <VerifiedBadge className="h-4 w-4" />}</div>
        {u.bio && <p className="text-[13px] text-muted-foreground truncate">{u.bio}</p>}
      </div>
      {user?.id !== u.user_id && (
        <Button size="sm" variant={followingSet.has(u.user_id) ? "outline" : "default"} onClick={e => { e.stopPropagation(); toggleFollow(u.user_id); }} className={`rounded-full text-[13px] font-bold h-8 px-4 ${!followingSet.has(u.user_id) ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}>
          {followingSet.has(u.user_id) ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="h-[53px] flex items-center gap-6 px-4">
          <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-xl font-bold">Connections</h1>
        </div>
        <Tabs defaultValue="followers">
          <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
            <TabsTrigger value="followers" className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full">Followers ({followers.length})</TabsTrigger>
            <TabsTrigger value="following" className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full">Following ({following.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="followers" className="mt-0">
            {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : followers.length === 0 ? <div className="text-center py-20"><Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">No followers yet</p></div> : followers.map(u => <UserRow key={u.user_id} u={u} />)}
          </TabsContent>
          <TabsContent value="following" className="mt-0">
            {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : following.length === 0 ? <div className="text-center py-20"><Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Not following anyone</p></div> : following.map(u => <UserRow key={u.user_id} u={u} />)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FollowersPage;
