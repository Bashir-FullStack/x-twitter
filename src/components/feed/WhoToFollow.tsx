import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/VerifiedBadge";
import UserAvatar from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";

interface UserSuggestion {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  following: boolean;
}

const WhoToFollow = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);

  useEffect(() => {
    if (!user) return;
    loadSuggestions();
  }, [user]);

  const loadSuggestions = async () => {
    if (!user) return;
    const { data: following } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    const followingIds = new Set(following?.map((f) => f.following_id) || []);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, bio, is_verified, avatar_url")
      .neq("user_id", user.id)
      .limit(20);

    const notFollowing = (profiles || [])
      .filter((p) => !followingIds.has(p.user_id))
      .slice(0, 5)
      .map((p) => ({ ...p, following: false }));

    setSuggestions(notFollowing);
  };

  const toggleFollow = async (userId: string) => {
    if (!user) return;
    const suggestion = suggestions.find((s) => s.user_id === userId);
    if (!suggestion) return;

    if (suggestion.following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setSuggestions((prev) => prev.map((s) => s.user_id === userId ? { ...s, following: false } : s));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      setSuggestions((prev) => prev.map((s) => s.user_id === userId ? { ...s, following: true } : s));
      toast({ title: `Following ${suggestion.display_name}` });
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <Card className="border-border/50 bg-muted/30 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-xl font-extrabold">Who to follow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 pt-0 -mx-3 px-0">
        {suggestions.map((u) => (
          <div
            key={u.user_id}
            className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => navigate(`/dashboard/user/${u.user_id}`)}
          >
            <UserAvatar avatarUrl={u.avatar_url} displayName={u.display_name} className="h-10 w-10 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm truncate">{u.display_name || "User"}</span>
                {u.is_verified && <VerifiedBadge className="h-[15px] w-[15px]" />}
              </div>
              {u.bio && <p className="text-xs text-muted-foreground truncate">{u.bio}</p>}
            </div>
            <Button
              size="sm"
              variant={u.following ? "outline" : "default"}
              onClick={(e) => { e.stopPropagation(); toggleFollow(u.user_id); }}
              className={`rounded-full text-xs h-8 px-4 font-bold ${!u.following ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
            >
              {u.following ? "Following" : "Follow"}
            </Button>
          </div>
        ))}
        <button className="w-full text-left px-6 py-3 text-sm text-primary hover:bg-muted/50 transition-colors">
          Show more
        </button>
      </CardContent>
    </Card>
  );
};

export default WhoToFollow;
