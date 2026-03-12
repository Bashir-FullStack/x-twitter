import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Zap, ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "Reset link sent!" });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-6">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-[400px] space-y-8">
        <div>
          <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
          <Zap className="h-10 w-10 text-primary mb-6" />
          <h1 className="font-display text-3xl font-bold tracking-tight">Reset password</h1>
          <p className="text-muted-foreground mt-2">Enter your email and we'll send you a reset link.</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4 py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <h2 className="font-display text-xl font-bold">Check your email</h2>
            <p className="text-muted-foreground text-sm">
              We sent a password reset link to<br /><strong className="text-foreground">{email}</strong>
            </p>
            <Button variant="outline" onClick={() => setSent(false)} className="rounded-full">
              Try another email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-12 rounded-lg" />
            </div>
            <Button type="submit" disabled={loading || !email} className="w-full h-12 rounded-full gradient-primary text-primary-foreground font-bold">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
