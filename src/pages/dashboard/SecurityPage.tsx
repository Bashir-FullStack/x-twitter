import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Shield, Key, Monitor, AlertTriangle, Lock, Eye, EyeOff,
  ChevronRight, Smartphone, Globe
} from "lucide-react";

interface ActivityEntry {
  id: string;
  action: string;
  details: any;
  ip_address: string | null;
  created_at: string;
}

const SecurityPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("activity_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20).then(({ data }) => {
      setActivityLog((data as ActivityEntry[]) || []);
    });
  }, [user]);

  const changePassword = async () => {
    if (newPassword.length < 6) { toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Error", description: "Passwords don't match", variant: "destructive" }); return; }
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Password updated" }); setNewPassword(""); setConfirmPassword(""); setShowChangePwd(false); }
    setChangingPwd(false);
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    toast({ title: "Signed out from all devices" });
  };

  // Password strength
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(newPassword);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"][strength] || "";
  const strengthColor = ["", "bg-destructive", "bg-warning", "bg-warning", "bg-success", "bg-success"][strength] || "";

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-bold">Security</h1>
      </div>

      <div className="divide-y divide-border">
        {/* Change Password */}
        <div>
          <button onClick={() => setShowChangePwd(!showChangePwd)} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors text-left">
            <Key className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[15px] font-medium">Change password</p>
              <p className="text-[13px] text-muted-foreground">Update your password at any time</p>
            </div>
            <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${showChangePwd ? "rotate-90" : ""}`} />
          </button>
          {showChangePwd && (
            <div className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px]">New Password</Label>
                <div className="relative">
                  <Input type={showPwd ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="h-11 pr-10" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1 h-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`flex-1 rounded-full ${i <= strength ? strengthColor : "bg-muted"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{strengthLabel}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="h-11" />
              </div>
              <Button onClick={changePassword} disabled={changingPwd} className="w-full rounded-full gradient-primary text-primary-foreground font-bold h-11">
                {changingPwd ? "Updating..." : "Update Password"}
              </Button>
            </div>
          )}
        </div>

        {/* Security Settings */}
        <div className="px-4 py-4 space-y-5">
          <h2 className="text-[13px] font-semibold text-muted-foreground">Security preferences</h2>
          {[
            { label: "Login notifications", desc: "Get notified on new sign-ins", icon: Bell },
            { label: "Suspicious activity alerts", desc: "Alert on unusual activity", icon: AlertTriangle },
            { label: "Two-factor authentication", desc: "Add extra security to your account", icon: Shield },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-[15px]">{item.label}</p>
                <p className="text-[13px] text-muted-foreground">{item.desc}</p>
              </div>
              <Switch defaultChecked={item.label !== "Two-factor authentication"} />
            </div>
          ))}
        </div>

        {/* Session Management */}
        <div className="px-4 py-4 space-y-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground">Sessions</h2>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[15px] font-medium">Current session</p>
              <p className="text-[13px] text-muted-foreground">{user?.email}</p>
            </div>
            <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Active</span>
          </div>
          <Button variant="outline" className="w-full rounded-full text-destructive border-destructive/30 hover:bg-destructive/5" onClick={signOutAll}>
            <AlertTriangle className="h-4 w-4 mr-2" /> Sign out all devices
          </Button>
        </div>

        {/* Activity Log */}
        <div className="px-4 py-4">
          <h2 className="text-[13px] font-semibold text-muted-foreground mb-3">Recent activity</h2>
          {activityLog.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity logged yet</p>
          ) : (
            <div className="space-y-3">
              {activityLog.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-[15px]">{entry.action}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                      {entry.ip_address ? ` · ${entry.ip_address}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Bell icon inline
const Bell = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

export default SecurityPage;
