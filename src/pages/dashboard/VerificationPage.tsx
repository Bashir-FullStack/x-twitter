import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Users, Heart, Shield, UserPlus, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

const REQUIREMENTS = {
  followers: 300,
  likes: 300,
  referrals: 7,
};

const VerificationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, totalLikes: 0, referrals: 0, violations: 0 });
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, followersRes, postsRes, referralsRes, reportsRes, requestRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("posts").select("likes_count").eq("user_id", user.id).eq("status", "published"),
      supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id).eq("status", "completed"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("reported_user_id", user.id).eq("status", "resolved"),
      supabase.from("verification_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    ]);

    setProfile(profileRes.data);
    const totalLikes = (postsRes.data || []).reduce((sum, p) => sum + (p.likes_count || 0), 0);
    setStats({
      followers: followersRes.count || 0,
      totalLikes,
      referrals: referralsRes.count || 0,
      violations: reportsRes.count || 0,
    });
    setExistingRequest(requestRes.data?.[0] || null);
    setLoading(false);
  };

  const meetsRequirements = stats.followers >= REQUIREMENTS.followers && stats.totalLikes >= REQUIREMENTS.likes && stats.referrals >= REQUIREMENTS.referrals && stats.violations === 0;

  const submitRequest = async () => {
    if (!user || !meetsRequirements) return;
    setSubmitting(true);
    const { error } = await supabase.from("verification_requests").insert({
      user_id: user.id,
      followers_count: stats.followers,
      likes_count: stats.totalLikes,
      referrals_count: stats.referrals,
      has_violations: stats.violations > 0,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verification request submitted!" });
      loadData();
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const requirements = [
    { icon: Users, label: `${REQUIREMENTS.followers}+ Followers`, current: stats.followers, target: REQUIREMENTS.followers, met: stats.followers >= REQUIREMENTS.followers },
    { icon: Heart, label: `${REQUIREMENTS.likes}+ Total Likes`, current: stats.totalLikes, target: REQUIREMENTS.likes, met: stats.totalLikes >= REQUIREMENTS.likes },
    { icon: UserPlus, label: `${REQUIREMENTS.referrals}+ Invited Friends`, current: stats.referrals, target: REQUIREMENTS.referrals, met: stats.referrals >= REQUIREMENTS.referrals },
    { icon: Shield, label: "No Spam/Rule Violations", current: stats.violations, target: 0, met: stats.violations === 0, inverse: true },
  ];

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Blue Tick Verification</h1>
      </div>

      <div className="p-6 space-y-6">
        {profile?.is_verified && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <BadgeCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="font-bold text-primary">You're verified!</p>
                <p className="text-sm text-muted-foreground">Your account has the blue tick.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {existingRequest && existingRequest.status === "pending" && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-6 w-6 text-warning" />
              <div>
                <p className="font-bold text-warning">Request Pending</p>
                <p className="text-sm text-muted-foreground">Submitted {new Date(existingRequest.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {existingRequest && existingRequest.status === "rejected" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-4">
              <XCircle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-bold text-destructive">Request Denied</p>
                <p className="text-sm text-muted-foreground">{existingRequest.admin_notes || "Your request did not meet the requirements."}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="font-display text-lg font-bold mb-1">Requirements</h2>
          <p className="text-sm text-muted-foreground mb-4">Meet all requirements below to request verification.</p>
        </div>

        <div className="space-y-3">
          {requirements.map((req) => (
            <Card key={req.label} className={`border-border/50 ${req.met ? "border-success/30" : ""}`}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${req.met ? "bg-success/10" : "bg-muted"}`}>
                  <req.icon className={`h-5 w-5 ${req.met ? "text-success" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[15px]">{req.label}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {req.inverse ? (req.met ? "No violations found" : `${req.current} violation(s)`) : `${req.current} / ${req.target}`}
                  </p>
                </div>
                {req.met ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {!profile?.is_verified && (!existingRequest || existingRequest.status === "rejected") && (
          <Button
            onClick={submitRequest}
            disabled={!meetsRequirements || submitting}
            className="w-full rounded-full gradient-primary text-primary-foreground font-bold h-12"
          >
            {submitting ? "Submitting..." : meetsRequirements ? "Request Verification" : "Requirements Not Met"}
          </Button>
        )}

        {!meetsRequirements && !profile?.is_verified && (
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">How to get verified</p>
              <ul className="text-[13px] text-muted-foreground mt-1 space-y-1 list-disc pl-4">
                <li>Grow your followers to {REQUIREMENTS.followers}+</li>
                <li>Create engaging content to get {REQUIREMENTS.likes}+ total likes</li>
                <li>Invite {REQUIREMENTS.referrals} friends using your referral link</li>
                <li>Keep your account violation-free</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationPage;
