import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import FeedPost from "@/components/feed/FeedPost";
import VerifiedBadge from "@/components/VerifiedBadge";
import { ArrowLeft, Calendar, Mail, MoreHorizontal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { FeedPostData } from "@/pages/Dashboard";

interface UserProfileData {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadProfile();
  }, [userId, user]);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);

    const [profileRes, followersRes, followingRes, postsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("follows").select("id", { count: "exact" }).eq("following_id", userId),
      supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", userId),
      supabase.from("posts").select("*").eq("user_id", userId).eq("status", "published").order("created_at", { ascending: false }),
    ]);

    setProfile(profileRes.data);
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);

    if (user) {
      const { data: followData } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle();
      setIsFollowing(!!followData);
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

      setPosts(
        postsRes.data.map((p) => ({
          ...p,
          tags: p.tags || [],
          profile: {
            display_name: profileRes.data.display_name || "User",
            avatar_url: profileRes.data.avatar_url,
            is_verified: profileRes.data.is_verified,
            user_id: userId,
          },
          liked: likedSet.has(p.id),
          bookmarked: bookmarkedSet.has(p.id),
          reposted: repostedSet.has(p.id),
        }))
      );
    }

    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!user || !userId) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setIsFollowing(false);
      setFollowersCount((c) => c - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
      toast({ title: `Following ${profile?.display_name}` });
    }
  };

  const startMessage = () => navigate("/dashboard/messages");

  if (loading) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
        <div className="animate-pulse">
          <div className="h-[53px] border-b border-border" />
          <div className="h-48 bg-muted" />
          <div className="px-4 pb-4">
            <div className="h-20 w-20 rounded-full bg-muted -mt-10 border-4 border-background" />
            <div className="h-5 w-32 bg-muted rounded mt-3" />
            <div className="h-4 w-48 bg-muted rounded mt-2" />
          </div>
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

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display font-bold text-[17px] leading-tight flex items-center gap-1">
            {profile.display_name || "User"}
            {profile.is_verified && <VerifiedBadge className="h-5 w-5" />}
          </h1>
          <p className="text-[13px] text-muted-foreground">{posts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20" />
        <div className="absolute -bottom-16 left-4">
          <div className="h-[134px] w-[134px] rounded-full border-4 border-background bg-muted flex items-center justify-center text-4xl font-bold text-primary">
            {profile.display_name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end items-center gap-2 p-4">
        {user?.id !== userId && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive">Report user</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Block user</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={startMessage}>
              <Mail className="h-5 w-5" />
            </Button>
            <Button
              onClick={toggleFollow}
              variant={isFollowing ? "outline" : "default"}
              className={`rounded-full px-5 font-bold ${!isFollowing ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          </>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pb-4">
        <h2 className="font-display text-xl font-bold flex items-center gap-1">
          {profile.display_name}
          {profile.is_verified && <VerifiedBadge className="h-5 w-5" />}
        </h2>
        {profile.bio && <p className="text-[15px] mt-2 leading-[20px]">{profile.bio}</p>}
        <div className="flex items-center gap-4 mt-3 text-[15px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="flex gap-5 mt-3">
          <span className="text-[15px]">
            <strong>{followingCount}</strong> <span className="text-muted-foreground">Following</span>
          </span>
          <span className="text-[15px]">
            <strong>{followersCount}</strong> <span className="text-muted-foreground">Followers</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts">
        <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
          {["Posts", "Replies", "Media", "Likes"].map(t => (
            <TabsTrigger
              key={t}
              value={t.toLowerCase()}
              className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Posts */}
      {posts.length > 0 ? (
        posts.map((post) => <FeedPost key={post.id} post={post} onUpdate={loadProfile} />)
      ) : (
        <div className="text-center py-16">
          <p className="text-[15px] text-muted-foreground">No posts yet</p>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
