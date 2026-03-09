import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";
import UserAvatar from "@/components/UserAvatar";
import FeedPost from "@/components/feed/FeedPost";
import FollowListDialog from "@/components/FollowListDialog";
import { ArrowLeft, Calendar, Camera, MapPin, LinkIcon, Mail, Shield, Share } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadAvatar, getAvatarUrl } from "@/lib/avatar";
import type { FeedPostData } from "@/pages/Dashboard";

const ProfilePage = () => {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", bio: "", phone: "", website: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("posts");
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  const [likedPosts, setLikedPosts] = useState<FeedPostData[]>([]);

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
      supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setProfile(profileRes.data);
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);

    if (profileRes.data) {
      setEditForm({
        display_name: profileRes.data.display_name || "",
        bio: profileRes.data.bio || "",
        phone: profileRes.data.phone || "",
        website: "",
        location: "",
      });
    }

    const allPosts = postsRes.data || [];
    const filteredPosts = tab === "drafts"
      ? allPosts.filter(p => p.status === "draft")
      : allPosts.filter(p => p.status === "published");

    if (filteredPosts.length && profileRes.data) {
      const postIds = filteredPosts.map((p) => p.id);
      const [likesRes, bookmarksRes, repostsRes] = await Promise.all([
        supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
        supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
        supabase.from("reposts").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      ]);
      const likedSet = new Set(likesRes.data?.map((l) => l.post_id));
      const bookmarkedSet = new Set(bookmarksRes.data?.map((b) => b.post_id));
      const repostedSet = new Set(repostsRes.data?.map((r) => r.post_id));

      setPosts(filteredPosts.map((p) => ({
        ...p, tags: p.tags || [],
        profile: { display_name: profileRes.data.display_name || "User", avatar_url: profileRes.data.avatar_url, is_verified: profileRes.data.is_verified, user_id: user.id },
        liked: likedSet.has(p.id), bookmarked: bookmarkedSet.has(p.id), reposted: repostedSet.has(p.id),
      })));
    } else {
      setPosts([]);
    }

    // Load liked posts for the Likes tab
    if (tab === "likes") {
      const { data: likedData } = await supabase.from("likes").select("post_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (likedData?.length) {
        const likedPostIds = likedData.map(l => l.post_id);
        const { data: likedPostsData } = await supabase.from("posts").select("*").in("id", likedPostIds).eq("status", "published");
        if (likedPostsData?.length) {
          const userIds = [...new Set(likedPostsData.map(p => p.user_id))];
          const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, is_verified").in("user_id", userIds);
          setLikedPosts(likedPostsData.map(p => {
            const prof = profiles?.find(pr => pr.user_id === p.user_id);
            return { ...p, tags: p.tags || [], profile: { display_name: prof?.display_name || "User", avatar_url: prof?.avatar_url, is_verified: prof?.is_verified || false, user_id: p.user_id }, liked: true, bookmarked: false, reposted: false };
          }));
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user && profile) loadProfile();
  }, [tab]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Max 5MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      await uploadAvatar(user.id, file);
      setAvatarPreview(URL.createObjectURL(file));
      toast({ title: "Profile picture updated!" });
      loadProfile();
    } catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: editForm.display_name, bio: editForm.bio, phone: editForm.phone }).eq("user_id", user.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Profile updated" }); setEditOpen(false); loadProfile(); }
    setSaving(false);
  };

  const shareProfile = () => {
    const url = `${window.location.origin}/dashboard/user/${user?.id}`;
    if (navigator.share) { navigator.share({ title: profile?.display_name, url }); }
    else { navigator.clipboard.writeText(url); toast({ title: "Profile link copied!" }); }
  };

  const avatarUrl = avatarPreview || getAvatarUrl(profile?.avatar_url);
  const displayPosts = tab === "likes" ? likedPosts : posts;
  const mediaPosts = posts.filter(p => p.image_url);

  if (loading) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
        <div className="animate-pulse">
          <div className="h-48 bg-muted" />
          <div className="px-4 pb-4"><div className="h-[134px] w-[134px] rounded-full bg-muted -mt-[67px] border-4 border-background" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-[17px] leading-tight flex items-center gap-1">
            {profile?.display_name || "User"}
            {profile?.is_verified && <VerifiedBadge className="h-5 w-5" />}
            {isAdmin && <Shield className="h-4 w-4 text-success" />}
          </h1>
          <p className="text-[13px] text-muted-foreground">{posts.length} posts</p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={shareProfile}>
          <Share className="h-5 w-5" />
        </Button>
      </div>

      {/* Banner */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20" />
        <div className="absolute -bottom-[67px] left-4">
          <div className="relative group">
            <div className="h-[134px] w-[134px] rounded-full border-4 border-background overflow-hidden bg-muted">
              {avatarUrl ? <img src={avatarUrl} alt={profile?.display_name} className="h-full w-full object-cover" /> : (
                <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-primary bg-primary/10">{profile?.display_name?.[0]?.toUpperCase() || "U"}</div>
              )}
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute inset-0 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-8 w-8 text-white" />
            </button>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-foreground/60 flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end p-4">
        <Button variant="outline" className="rounded-full font-bold" onClick={() => setEditOpen(true)}>Edit profile</Button>
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4 mt-4">
        <h2 className="font-display text-xl font-bold flex items-center gap-1">
          {profile?.display_name}
          {profile?.is_verified && <VerifiedBadge className="h-5 w-5" />}
          {isAdmin && <span className="ml-1 text-[10px] font-bold bg-success/20 text-success px-2 py-0.5 rounded-full">ADMIN</span>}
        </h2>
        <p className="text-[15px] text-muted-foreground">@{user?.email?.split("@")[0]}</p>
        {profile?.bio && <p className="text-[15px] mt-3 leading-[20px]">{profile.bio}</p>}
        <div className="flex items-center gap-4 mt-3 text-[15px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{user?.email}</span>
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {new Date(profile?.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        </div>
        <div className="flex gap-5 mt-3">
          <button onClick={() => setFollowListType("following")} className="text-[15px] hover:underline">
            <strong>{followingCount}</strong> <span className="text-muted-foreground">Following</span>
          </button>
          <button onClick={() => setFollowListType("followers")} className="text-[15px] hover:underline">
            <strong>{followersCount}</strong> <span className="text-muted-foreground">Followers</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
          {["Posts", "Drafts", "Media", "Likes"].map(t => (
            <TabsTrigger key={t} value={t.toLowerCase()} className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Posts */}
      {tab === "media" ? (
        mediaPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {mediaPosts.map(p => (
              <div key={p.id} className="aspect-square cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(`/dashboard/post/${p.id}`)}>
                <img src={p.image_url!} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground"><p className="text-[15px]">No media posts</p></div>
        )
      ) : displayPosts.length > 0 ? (
        <div className="pb-16 lg:pb-0">{displayPosts.map((post) => <FeedPost key={post.id} post={post} onUpdate={loadProfile} />)}</div>
      ) : (
        <div className="text-center py-16 text-muted-foreground"><p className="text-[15px]">{tab === "drafts" ? "No drafts" : tab === "likes" ? "No liked posts" : "No posts yet"}</p></div>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="font-display">Edit profile</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-muted">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xl font-bold text-primary bg-primary/10">{editForm.display_name?.[0]?.toUpperCase() || "U"}</div>}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="h-5 w-5 text-white" /></button>
              </div>
              <div>
                <p className="text-sm font-medium">Profile picture</p>
                <button onClick={() => fileInputRef.current?.click()} className="text-sm text-primary hover:underline">{uploading ? "Uploading..." : "Change photo"}</button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} maxLength={50} />
              <p className="text-xs text-muted-foreground text-right">{editForm.display_name.length}/50</p>
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell the world about yourself" rows={3} className="resize-none" maxLength={160} />
              <p className="text-xs text-muted-foreground text-right">{editForm.bio.length}/160</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="City, Country" className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} placeholder="https://" className="pl-10" />
                </div>
              </div>
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

      <FollowListDialog open={followListType !== null} onOpenChange={(open) => !open && setFollowListType(null)} userId={user?.id || ""} type={followListType || "followers"} title={followListType === "followers" ? "Followers" : "Following"} />
    </div>
  );
};

export default ProfilePage;
