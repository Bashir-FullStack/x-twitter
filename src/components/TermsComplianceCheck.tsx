import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const TermsComplianceCheck = () => {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("terms_accepted").eq("user_id", user.id).single().then(({ data }) => {
      if (data && !data.terms_accepted) {
        setShowDialog(true);
      }
    });
  }, [user]);

  const handleAccept = async () => {
    if (!user || !accepted) return;
    setSaving(true);
    await supabase.from("profiles").update({ terms_accepted: true }).eq("user_id", user.id);
    setShowDialog(false);
    setSaving(false);
  };

  return (
    <Dialog open={showDialog} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[450px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Shield className="h-5 w-5 text-primary" /> Terms & Privacy Update
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To continue using Platform, please review and accept our updated Terms of Service and Privacy Policy.
          </p>
          <div className="p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
            <p>By accepting, you agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Our <Link to="/dashboard/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link></li>
              <li>Our <Link to="/dashboard/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link></li>
              <li>Collection and use of data as described</li>
            </ul>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="accept-terms" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-1" />
            <label htmlFor="accept-terms" className="text-sm cursor-pointer">
              I have read and agree to the Terms of Service and Privacy Policy
            </label>
          </div>
          <Button onClick={handleAccept} disabled={!accepted || saving} className="w-full rounded-full gradient-primary text-primary-foreground font-bold">
            {saving ? "Saving..." : "Accept & Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsComplianceCheck;
