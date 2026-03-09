import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Check, Zap } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useToast } from "@/hooks/use-toast";

interface SuggestedUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_mandatory: boolean;
}

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSuggestedFollows();
  }, [user]);

  const loadSuggestedFollows = async () => {
    const { data: suggested } = await supabase
      .from("suggested_follows")
      .select("user_id, is_mandatory, display_order")
      .order("display_order");

    if (!suggested?.length) {
      await completeOnboarding();
      return;
    }

    const userIds = suggested.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, is_verified")
      .in("user_id", userIds);

    const merged: SuggestedUser[] = suggested.map((s) => {
      const profile = profiles?.find((p) => p.user_id === s.user_id);
      return {
        user_id: s.user_id,
        display_name: profile?.display_name || "User",
        avatar_url: profile?.avatar_url,
        is_verified: profile?.is_verified || false,
        is_mandatory: s.is_mandatory,
      };
    });

    setSuggestedUsers(merged);
    // Auto-select mandatory
    const mandatoryIds = new Set(merged.filter((u) => u.is_mandatory).map((u) => u.user_id));
    setFollowedIds(mandatoryIds);
    setLoading(false);
  };

  const toggleFollow = (userId: string, isMandatory: boolean) => {
    if (isMandatory) return; // Can't unfollow mandatory
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const completeOnboarding = async () => {
    setSubmitting(true);

    // Insert follows
    if (followedIds.size > 0 && user) {
      const follows = Array.from(followedIds).map((id) => ({
        follower_id: user.id,
        following_id: id,
      }));
      await supabase.from("follows").insert(follows);
    }

    // Mark onboarding complete
    if (user) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
    }

    navigate("/dashboard", { replace: true });
  };

  const mandatoryCount = suggestedUsers.filter((u) => u.is_mandatory).length;
  const allMandatoryFollowed = suggestedUsers
    .filter((u) => u.is_mandatory)
    .every((u) => followedIds.has(u.user_id));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Welcome! Follow these accounts</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Follow the accounts below to get started. {mandatoryCount > 0 && "Required accounts are marked."}
          </p>
        </div>

        <div className="space-y-3">
          {suggestedUsers.map((u) => {
            const isFollowed = followedIds.has(u.user_id);
            return (
              <Card key={u.user_id} className={`border-border/50 transition-all ${isFollowed ? "ring-1 ring-primary/30" : ""}`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {u.display_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{u.display_name}</span>
                        {u.is_verified && <VerifiedBadge className="h-4 w-4" />}
                      </div>
                      {u.is_mandatory && (
                        <span className="text-[10px] text-warning font-medium">Required</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isFollowed ? "default" : "outline"}
                    onClick={() => toggleFollow(u.user_id, u.is_mandatory)}
                    disabled={u.is_mandatory}
                    className={isFollowed ? "gradient-primary text-primary-foreground" : ""}
                  >
                    {isFollowed ? <><Check className="h-3.5 w-3.5 mr-1" /> Following</> : <><UserPlus className="h-3.5 w-3.5 mr-1" /> Follow</>}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          className="w-full mt-6 gradient-primary text-primary-foreground"
          disabled={!allMandatoryFollowed || submitting}
          onClick={completeOnboarding}
        >
          {submitting ? "Setting up..." : "Continue to Dashboard"}
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
