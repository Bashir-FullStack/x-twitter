import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Shield, Key, Monitor, AlertTriangle, Lock, Eye, EyeOff } from "lucide-react";

interface ActivityEntry {
  id: string;
  action: string;
  details: any;
  ip_address: string | null;
  created_at: string;
}

const SecurityPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

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
    else { toast({ title: "Password updated" }); setNewPassword(""); setConfirmPassword(""); }
    setChangingPwd(false);
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    toast({ title: "Signed out from all devices" });
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="font-display text-2xl font-bold">Security</h1>

      {/* Change Password */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Key className="h-5 w-5" /> Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="relative">
              <Input type={showPwd ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
          </div>
          <Button onClick={changePassword} disabled={changingPwd} className="gradient-primary text-primary-foreground">
            <Lock className="mr-2 h-4 w-4" /> {changingPwd ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Monitor className="h-5 w-5" /> Session Management</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Session</p>
              <p className="text-xs text-muted-foreground">Logged in as {user?.email}</p>
            </div>
            <Badge className="bg-success text-success-foreground">Active</Badge>
          </div>
          <Button variant="destructive" onClick={signOutAll}>
            <AlertTriangle className="mr-2 h-4 w-4" /> Sign Out All Devices
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5" /> Security Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Login Notifications</Label>
              <p className="text-xs text-muted-foreground">Get notified on new sign-ins</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Suspicious Activity Alerts</Label>
              <p className="text-xs text-muted-foreground">Alert on unusual activity</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Monitor className="h-5 w-5" /> Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {activityLog.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity logged yet</p>
          ) : (
            <div className="space-y-3">
              {activityLog.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{entry.action}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}{entry.ip_address ? ` · ${entry.ip_address}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityPage;
