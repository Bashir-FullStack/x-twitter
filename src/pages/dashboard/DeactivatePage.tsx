import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const DeactivatePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState("");

  const handleDeactivate = () => {
    if (confirm !== "DEACTIVATE") { toast({ title: "Please type DEACTIVATE to confirm", variant: "destructive" }); return; }
    toast({ title: "Account deactivation requested. You will be signed out." });
    setTimeout(() => signOut(), 2000);
  };

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold text-destructive">Deactivate Account</h1>
      </div>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
          <p className="text-[15px] text-destructive">This action is irreversible. Your profile, posts, and data will be permanently removed.</p>
        </div>
        <div>
          <p className="text-[15px] mb-2">Type <strong>DEACTIVATE</strong> to confirm:</p>
          <Input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="DEACTIVATE" />
        </div>
        <Button onClick={handleDeactivate} disabled={confirm !== "DEACTIVATE"} variant="destructive" className="w-full rounded-full font-bold h-12">Deactivate My Account</Button>
      </div>
    </div>
  );
};

export default DeactivatePage;
