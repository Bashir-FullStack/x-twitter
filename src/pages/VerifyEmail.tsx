import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Zap, Mail, RefreshCw } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const VerifyEmail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const email = user?.email || localStorage.getItem("pending_verification_email") || "";

  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate("/onboarding", { replace: true });
    }
  }, [user]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });
    if (error) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email verified! ✓" });
      localStorage.removeItem("pending_verification_email");
      navigate("/onboarding", { replace: true });
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      toast({ title: "Failed to resend", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verification code sent!" });
      setCountdown(60);
    }
    setResending(false);
  };

  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-6">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-[400px] text-center space-y-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow">
          <Mail className="h-8 w-8 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Check your email</h1>
          <p className="text-muted-foreground mt-3 text-[15px]">
            We sent a 6-digit verification code to<br />
            <strong className="text-foreground">{email}</strong>
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={handleVerify}
          disabled={otp.length !== 6 || loading}
          className="w-full h-12 rounded-full gradient-primary text-primary-foreground font-bold text-[15px]"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </Button>

        <div className="space-y-3">
          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="text-primary text-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${resending ? "animate-spin" : ""}`} />
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Didn't receive the code? Check your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
