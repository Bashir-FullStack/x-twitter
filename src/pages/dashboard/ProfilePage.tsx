import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";
import FeedPost from "@/components/feed/FeedPost";
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon, Camera, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FeedPostData } from "@/pages/Dashboard";

const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", bio: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("posts");

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, followersRes, followingRes, postsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("posts").select("*").eq("user_id", user.id).eq("status", "published").order("created_at", { ascending: false }),
    ]);

    setProfile(profileRes.data);
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);

    if (profileRes.data) {
      setEditForm({
        display_name: profileRes.data.display_name || "",
        bio: profileRes.data.bio || "",
        phone: profileRes.data.phone || "",
      });
    }

    if (postsRes.data?.length && profileRes.data) {
      const postIds = postsRes.data.map((p) => p.id);
      const [likesRes, bookmarksRes, repostsRes] = await Promise.all([
        supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
        supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
        supabase.from("reposts").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      ]);
      const likedSet = new Set(likesRes.data?.map((l) => l.post_id));
      const bookmarkedSet = new Set(bookmarksRes.data?.map((b) => b.post_id));
      const repostedSet = new Set(repostsRes.data?.map((r) => r.post_id));

      setPosts(postsRes.data.map((p) => ({
        ...p,
        tags: p.tags || [],
        profile: {
          display_name: profileRes.data.display_name || "User",
          avatar_url: profileRes.data.avatar_url,
          is_verified: profileRes.data.is_verified,
          user_id: user.id,
        },
        liked: likedSet.has(p.id),
        bookmarked: bookmarkedSet.has(p.id),
        reposted: repostedSet.has(p.id),
      })));
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(editForm).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      setEditOpen(false);
      loadProfile();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
        <div className="animate-pulse">
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

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display font-bold text-[17px] leading-tight flex items-center gap-1">
            {profile?.display_name || "User"}
            {profile?.is_verified && <VerifiedBadge className="h-5 w-5" />}
          </h1>
          <p className="text-[13px] text-muted-foreground">{posts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20" />
        <div className="absolute -bottom-16 left-4">
          <div className="h-[134px] w-[134px] rounded-full border-4 border-background bg-muted flex items-center justify-center text-4xl font-bold text-primary">
            {profile?.display_name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </div>

      {/* Edit Button */}
      <div className="flex justify-end p-4">
        <Button variant="outline" className="rounded-full font-bold" onClick={() => setEditOpen(true)}>
          Edit profile
        </Button>
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4">
        <h2 className="font-display text-xl font-bold flex items-center gap-1">
          {profile?.display_name}
          {profile?.is_verified && <VerifiedBadge className="h-5 w-5" />}
        </h2>
        <p className="text-[15px] text-muted-foreground">@{user?.email?.split("@")[0]}</p>
        {profile?.bio && <p className="text-[15px] mt-3 leading-[20px]">{profile.bio}</p>}
        <div className="flex items-center gap-4 mt-3 text-[15px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Joined {new Date(profile?.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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
      <Tabs value={tab} onValueChange={setTab}>
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
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-[15px]">No posts yet</p>
        </div>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-display">Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell the world about yourself" rows={3} className="resize-none" />
              <p className="text-xs text-muted-foreground text-right">{editForm.bio.length}/160</p>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full rounded-full gradient-primary text-primary-foreground font-bold">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
