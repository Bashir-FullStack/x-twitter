import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import FeedPost from "@/components/feed/FeedPost";
import VerifiedBadge from "@/components/VerifiedBadge";
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

    // Build feed posts
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-16 text-muted-foreground">User not found</div>;
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground hover:bg-muted rounded-full p-1.5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display font-bold flex items-center gap-1">
            {profile.display_name || "User"}
            {profile.is_verified && <VerifiedBadge className="h-5 w-5" />}
          </h1>
          <p className="text-xs text-muted-foreground">{posts.length} posts</p>
        </div>
      </div>

      {/* Banner + Avatar */}
      <div className="relative">
        <div className="h-36 bg-gradient-to-r from-primary/20 to-accent/20" />
        <div className="absolute -bottom-12 left-4">
          <div className="h-24 w-24 rounded-full border-4 border-background bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {profile.display_name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end p-4">
        {user?.id !== userId && (
          <Button
            onClick={toggleFollow}
            variant={isFollowing ? "outline" : "default"}
            className={`rounded-full px-5 ${!isFollowing ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pb-4 border-b border-border">
        <h2 className="font-display text-xl font-bold flex items-center gap-1">
          {profile.display_name}
          {profile.is_verified && <VerifiedBadge className="h-5 w-5" />}
        </h2>
        {profile.bio && <p className="text-sm mt-1">{profile.bio}</p>}
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="flex gap-4 mt-2">
          <span className="text-sm">
            <strong>{followingCount}</strong> <span className="text-muted-foreground">Following</span>
          </span>
          <span className="text-sm">
            <strong>{followersCount}</strong> <span className="text-muted-foreground">Followers</span>
          </span>
        </div>
      </div>

      {/* Posts */}
      {posts.length > 0 ? (
        posts.map((post) => <FeedPost key={post.id} post={post} onUpdate={loadProfile} />)
      ) : (
        <div className="text-center py-16 text-muted-foreground">No posts yet</div>
      )}
    </div>
  );
};

export default UserProfilePage;
