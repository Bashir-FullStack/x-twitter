import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Share2, UserPlus, Users, Gift, Link2, CheckCircle } from "lucide-react";

const ReferralPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadReferrals();
  }, [user]);

  const loadReferrals = async () => {
    if (!user) return;
    setLoading(true);

    // Get referral code from profile, or generate one
    const { data: profile } = await supabase.from("profiles").select("referral_code").eq("user_id", user.id).single();
    let code = profile?.referral_code;
    if (!code) {
      code = user.id.slice(0, 6).toUpperCase();
      await supabase.from("profiles").update({ referral_code: code }).eq("user_id", user.id);
    }
    setReferralCode(code);

    const { data } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    setReferrals(data || []);
    setLoading(false);
  };

  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Referral link copied!" });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join Platform!", text: "I'm inviting you to join Platform. Sign up with my referral link!", url: referralLink });
      } catch {}
    } else {
      copyLink();
    }
  };

  const sendInvite = async () => {
    if (!user || !inviteEmail.trim()) return;
    setSending(true);
    const { error } = await supabase.from("referrals").insert({
      referrer_id: user.id,
      referred_email: inviteEmail,
      referral_code: referralCode,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invite recorded!", description: `Invite sent to ${inviteEmail}` });
      setInviteEmail("");
      loadReferrals();
    }
    setSending(false);
  };

  const completedCount = referrals.filter(r => r.status === "completed").length;
  const pendingCount = referrals.filter(r => r.status === "pending").length;

  if (loading) {
    return (
      <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Invite Friends</h1>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold font-display">{referrals.length}</p>
              <p className="text-[11px] text-muted-foreground">Total Invites</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-success" />
              <p className="text-xl font-bold font-display">{completedCount}</p>
              <p className="text-[11px] text-muted-foreground">Joined</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Gift className="h-5 w-5 mx-auto mb-1 text-warning" />
              <p className="text-xl font-bold font-display">{7 - completedCount > 0 ? 7 - completedCount : 0}</p>
              <p className="text-[11px] text-muted-foreground">Needed for ✓</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <p className="font-bold text-[15px]">Your Referral Link</p>
            </div>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="text-[13px] bg-background" />
              <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0"><Copy className="h-4 w-4" /></Button>
            </div>
            <Button onClick={shareLink} className="w-full rounded-full gradient-primary text-primary-foreground font-bold">
              <Share2 className="h-4 w-4 mr-2" /> Share Link
            </Button>
          </CardContent>
        </Card>

        {/* Invite by Email */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <p className="font-bold text-[15px] flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Invite by Email</p>
            <div className="flex gap-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                type="email"
                className="flex-1"
                onKeyDown={e => e.key === "Enter" && sendInvite()}
              />
              <Button onClick={sendInvite} disabled={!inviteEmail.trim() || sending} className="rounded-full gradient-primary text-primary-foreground font-bold">
                {sending ? "..." : "Invite"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <div>
          <h2 className="font-display font-bold text-lg mb-3">Invite History</h2>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p>No invites yet. Share your link!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between px-4 py-3 border border-border/50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium">{ref.referred_email || "Link invite"}</p>
                    <p className="text-[12px] text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={ref.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                    {ref.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;
