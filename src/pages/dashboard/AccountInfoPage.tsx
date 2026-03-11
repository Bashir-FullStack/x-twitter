import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Mail, Shield, Clock } from "lucide-react";

const AccountInfoPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Account Info</h1>
      </div>
      <div className="divide-y divide-border">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-1"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">Email</span></div>
          <p className="text-[15px] pl-7">{user?.email}</p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-1"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">Joined</span></div>
          <p className="text-[15px] pl-7">{profile ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "..."}</p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-1"><Shield className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">Verification</span></div>
          <p className="text-[15px] pl-7">{profile?.is_verified ? "Verified ✓" : "Not verified"}</p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-1"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">Last seen</span></div>
          <p className="text-[15px] pl-7">{profile?.last_seen ? new Date(profile.last_seen).toLocaleString() : "Just now"}</p>
        </div>
      </div>
    </div>
  );
};

export default AccountInfoPage;
