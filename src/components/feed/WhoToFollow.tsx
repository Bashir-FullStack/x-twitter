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
  is_white_tick: boolean;
  following: boolean;
  is_admin: boolean;
}

const WhoToFollow = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSuggestions();
  }, [user]);

  const loadSuggestions = async () => {
    if (!user) return;
    const { data: following } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    const followingIds = new Set(following?.map((f) => f.following_id) || []);

    // Get suggested follows list
    const { data: suggestedData } = await supabase.from("suggested_follows").select("user_id").order("display_order");
    const suggestedIds = suggestedData?.map(s => s.user_id) || [];

    // Get admin user IDs
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").in("role", ["admin", "super_admin"]);
    const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);

    if (suggestedIds.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, bio, is_verified, avatar_url, is_white_tick")
      .in("user_id", suggestedIds);

    const notFollowing = (profiles || [])
      .filter((p) => !followingIds.has(p.user_id) && p.user_id !== user.id)
      .map((p) => ({ ...p, is_white_tick: p.is_white_tick || false, following: false, is_admin: adminIds.has(p.user_id) }));

    setSuggestions(notFollowing);
  };

  const toggleFollow = async (userId: string) => {
    if (!user) return;
    const suggestion = suggestions.find((s) => s.user_id === userId);
    if (!suggestion) return;

    if (suggestion.following) {
      if (suggestion.is_admin) {
        toast({ title: "Cannot unfollow admin accounts", variant: "destructive" });
        return;
      }
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setSuggestions((prev) => prev.map((s) => s.user_id === userId ? { ...s, following: false } : s));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      setSuggestions((prev) => prev.map((s) => s.user_id === userId ? { ...s, following: true } : s));
      toast({ title: `Following ${suggestion.display_name}` });
    }
  };

  if (suggestions.length === 0) return null;

  const displayed = showAll ? suggestions : suggestions.slice(0, 5);

  return (
    <Card className="border-border/50 bg-muted/30 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-xl font-extrabold">Who to follow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 pt-0 -mx-3 px-0">
        {displayed.map((u) => (
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
                {u.is_white_tick && !u.is_verified && (
                  <svg viewBox="0 0 22 22" className="h-[15px] w-[15px]" aria-label="Early member">
                    <path fill="hsl(0, 0%, 90%)" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.141.27.587.7 1.086 1.24 1.44s1.167.551 1.813.568c.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.27 1.894.14.636-.132 1.22-.436 1.69-.883.445-.47.75-1.054.88-1.69.131-.633.084-1.29-.139-1.896.587-.273 1.084-.705 1.439-1.246.355-.54.553-1.17.57-1.817z"/>
                    <path fill="#333" d="M9.585 14.929l-3.28-3.28 1.168-1.168 2.112 2.112 4.716-4.716 1.168 1.168z"/>
                  </svg>
                )}
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
        {suggestions.length > 5 && (
          <button onClick={() => setShowAll(!showAll)} className="w-full text-left px-6 py-3 text-sm text-primary hover:bg-muted/50 transition-colors">
            {showAll ? "Show less" : `Show more (${suggestions.length - 5})`}
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default WhoToFollow;
