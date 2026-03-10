import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FeedPost from "@/components/feed/FeedPost";
import FollowListDialog from "@/components/FollowListDialog";
import VerifiedBadge from "@/components/VerifiedBadge";
import UserAvatar from "@/components/UserAvatar";
import { getAvatarUrl } from "@/lib/avatar";
import { ArrowLeft, Calendar, MoreHorizontal, Shield, Ban, Flag, VolumeX, MessageSquare, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { FeedPostData } from "@/pages/Dashboard";

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mutualFollowers, setMutualFollowers] = useState<string[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  const [isAuthorAdmin, setIsAuthorAdmin] = useState(false);
  const [tab, setTab] = useState("posts");
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadProfile();
  }, [userId, user]);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);

    const [profileRes, followersRes, followingRes, postsRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("follows").select("id", { count: "exact" }).eq("following_id", userId),
      supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", userId),
      supabase.from("posts").select("*").eq("user_id", userId).eq("status", "published").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "super_admin"]),
    ]);

    setProfile(profileRes.data);
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);
    setIsAuthorAdmin((roleRes.data?.length || 0) > 0);
    setLastSeen(profileRes.data?.last_seen || null);

    if (user) {
      const { data: followData } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle();
      setIsFollowing(!!followData);

      const [myFollowing, theirFollowers] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("follows").select("follower_id").eq("following_id", userId),
      ]);
      const myFollowingSet = new Set(myFollowing.data?.map(f => f.following_id) || []);
      const mutuals = (theirFollowers.data || []).filter(f => myFollowingSet.has(f.follower_id) && f.follower_id !== user.id).map(f => f.follower_id);
      setMutualFollowers(mutuals.slice(0, 3));
    }

    if (postsRes.data?.length && profileRes.data) {
      const postIds = postsRes.data.map((p) => p.id);
      const [likesRes, bookmarksRes, repostsRes] = user
        ? await Promise.all([
            supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
            supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
            supabase.from("reposts").select("post_id").eq("user_id", user.id).in("post_id", postIds),
          ])
        : [{ data: [] }, { data: [] }, { data: [] }];

      const likedSet = new Set(likesRes.data?.map((l) => l.post_id));
      const bookmarkedSet = new Set(bookmarksRes.data?.map((b) => b.post_id));
      const repostedSet = new Set(repostsRes.data?.map((r) => r.post_id));

      setPosts(postsRes.data.map((p) => ({
        ...p, tags: p.tags || [],
        profile: { display_name: profileRes.data.display_name || "User", avatar_url: profileRes.data.avatar_url, is_verified: profileRes.data.is_verified, user_id: userId },
        liked: likedSet.has(p.id), bookmarked: bookmarkedSet.has(p.id), reposted: repostedSet.has(p.id),
      })));
    } else {
      setPosts([]);
    }

    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!user || !userId) return;
    // ❌ Can't unfollow admin accounts
    if (isFollowing && isAuthorAdmin) {
      toast({ title: "Cannot unfollow", description: "You cannot unfollow admin accounts.", variant: "destructive" });
      return;
    }
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setIsFollowing(false);
      setFollowersCount((c) => c - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
      toast({ title: `Following ${profile?.display_name}` });
      await supabase.from("notifications").insert({ user_id: userId, title: `${user.email?.split("@")[0]} followed you`, type: "follow" });
    }
  };

  const reportUser = async () => {
    if (!user || !userId || !reportReason.trim()) return;
    await supabase.from("reports").insert({ reporter_id: user.id, reported_user_id: userId, reason: reportReason });
    toast({ title: "User reported" });
    setShowReport(false);
    setReportReason("");
  };

  const blockUser = () => {
    setIsBlocked(true);
    if (isFollowing && !isAuthorAdmin) toggleFollow();
    toast({ title: `@${profile?.display_name} blocked` });
  };

  const muteUser = () => {
    setIsMuted(!isMuted);
    toast({ title: isMuted ? `@${profile?.display_name} unmuted` : `@${profile?.display_name} muted` });
  };

  const avatarUrl = getAvatarUrl(profile?.avatar_url);
  const mediaPosts = posts.filter(p => p.image_url);

  const formatLastSeen = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Online now";
    if (mins < 60) return `Last seen ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Last seen ${hours}h ago`;
    return `Last seen ${new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  if (loading) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
        <div className="animate-pulse">
          <div className="h-[53px] border-b border-border" />
          <div className="h-48 bg-muted" />
          <div className="px-4 pb-4"><div className="h-[134px] w-[134px] rounded-full bg-muted -mt-[67px] border-4 border-background" /></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0 flex items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
          <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-display font-bold text-[17px]">{profile.display_name}</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <Ban className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="font-display font-bold text-xl mb-1">@{profile.display_name} is blocked</h2>
          <p className="text-muted-foreground text-sm mb-4">You won't see their posts or messages.</p>
          <Button variant="outline" onClick={() => { setIsBlocked(false); toast({ title: "User unblocked" }); }}>Unblock</Button>
        </div>
      </div>
    );
  }

  const displayPosts = tab === "media" ? mediaPosts : posts;

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="font-display font-bold text-[17px] leading-tight flex items-center gap-1">
            {profile.display_name || "User"}
            {profile.is_verified && <VerifiedBadge className="h-5 w-5" />}
            {isAuthorAdmin && <Shield className="h-4 w-4 text-success" />}
          </h1>
          <p className="text-[13px] text-muted-foreground">{posts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20" />
        <div className="absolute -bottom-[67px] left-4">
          <div className="h-[134px] w-[134px] rounded-full border-4 border-background overflow-hidden bg-muted">
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile.display_name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-primary bg-primary/10">
                {profile.display_name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end items-center gap-2 p-4">
        {user?.id !== userId && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9"><MoreHorizontal className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowReport(true)} className="gap-2"><Flag className="h-4 w-4" /> Report @{profile.display_name}</DropdownMenuItem>
                <DropdownMenuItem onClick={muteUser} className="gap-2"><VolumeX className="h-4 w-4" /> {isMuted ? "Unmute" : "Mute"} @{profile.display_name}</DropdownMenuItem>
                <DropdownMenuSeparator />
                {!isAuthorAdmin && (
                  <DropdownMenuItem onClick={blockUser} className="gap-2 text-destructive"><Ban className="h-4 w-4" /> Block @{profile.display_name}</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate("/dashboard/messages")}>
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button
              onClick={toggleFollow}
              variant={isFollowing ? "outline" : "default"}
              className={`rounded-full px-5 font-bold ${!isFollowing ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
            >
              {isFollowing ? (isAuthorAdmin ? "Following ✓" : "Following") : "Follow"}
            </Button>
          </>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pb-4 mt-4">
        <h2 className="font-display text-xl font-bold flex items-center gap-1">
          {profile.display_name}
          {profile.is_verified && <VerifiedBadge className="h-5 w-5" />}
          {isAuthorAdmin && <span className="ml-1 text-[10px] font-bold bg-success/20 text-success px-2 py-0.5 rounded-full">ADMIN</span>}
        </h2>
        {/* ❌ Hide email for admin accounts */}
        {profile.bio && <p className="text-[15px] mt-2 leading-[20px]">{profile.bio}</p>}
        <div className="flex items-center gap-4 mt-3 text-[15px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          {/* Show last seen time */}
          {lastSeen && (
            <span className="text-[13px]">{formatLastSeen(lastSeen)}</span>
          )}
        </div>
        <div className="flex gap-5 mt-3">
          <button onClick={() => setFollowListType("following")} className="text-[15px] hover:underline">
            <strong>{followingCount}</strong> <span className="text-muted-foreground">Following</span>
          </button>
          <button onClick={() => setFollowListType("followers")} className="text-[15px] hover:underline">
            <strong>{followersCount}</strong> <span className="text-muted-foreground">Followers</span>
          </button>
        </div>

        {/* Mutual followers */}
        {mutualFollowers.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              {mutualFollowers.map((id, i) => (
                <div key={id} className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-bold">{i + 1}</div>
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground">
              Followed by {mutualFollowers.length} people you follow
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
          {["Posts", "Replies", "Media", "Likes"].map(t => (
            <TabsTrigger key={t} value={t.toLowerCase()} className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Posts */}
      {displayPosts.length > 0 ? (
        displayPosts.map((post) => <FeedPost key={post.id} post={post} onUpdate={loadProfile} />)
      ) : (
        <div className="text-center py-16">
          <p className="text-[15px] text-muted-foreground">{tab === "media" ? "No media posts" : "No posts yet"}</p>
        </div>
      )}

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report @{profile.display_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tell us why you're reporting this user.</p>
          <div className="space-y-2">
            {["Spam", "Harassment", "Impersonation", "Hate speech", "Other"].map(reason => (
              <button key={reason} onClick={() => setReportReason(reason)} className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${reportReason === reason ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
                {reason}
              </button>
            ))}
          </div>
          {reportReason === "Other" && (
            <Textarea value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Describe the issue..." rows={3} className="resize-none" />
          )}
          <Button onClick={reportUser} disabled={!reportReason} className="w-full rounded-full gradient-primary text-primary-foreground font-bold">
            Submit Report
          </Button>
        </DialogContent>
      </Dialog>

      {/* Follow List Dialog */}
      <FollowListDialog
        open={followListType !== null}
        onOpenChange={(open) => !open && setFollowListType(null)}
        userId={userId || ""}
        type={followListType || "followers"}
        title={followListType === "followers" ? "Followers" : "Following"}
      />
    </div>
  );
};

export default UserProfilePage;
