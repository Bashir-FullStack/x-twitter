import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Zap } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const HEARD_FROM_OPTIONS = [
  "Social Media", "Friend/Family", "Google Search", "YouTube", "Blog/Article",
  "App Store", "Advertisement", "Reddit", "Discord", "Other"
];

const PURPOSE_OPTIONS = [
  "Share updates", "Follow news", "Connect with friends", "Promote business",
  "Discover content", "Join communities", "Entertainment", "Networking"
];

const CATEGORY_OPTIONS = [
  "Software/Tech", "News & Media", "Influencer/Creator", "Business/Finance",
  "Education", "Health & Fitness", "Art & Design", "Music", "Gaming",
  "Sports", "Travel", "Food & Cooking", "Photography", "Science", "Other"
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState("");
  const [step, setStep] = useState(1); // 1 = credentials, 2 = questions
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const refCode = searchParams.get("ref");

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      handleLogin();
    } else {
      if (!acceptedTerms) {
        toast({ title: "Please accept Terms & Privacy Policy", variant: "destructive" });
        return;
      }
      setStep(2);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (loggedInUser) {
        await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", loggedInUser.id);
      }
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await signUp(email, password, displayName);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    localStorage.setItem("pending_verification_email", email);

    // Store additional signup data
    setTimeout(async () => {
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        const userRefCode = newUser.id.slice(0, 6).toUpperCase();
        await supabase.from("profiles").update({
          terms_accepted: true,
          category: category || null,
          referral_code: userRefCode,
          heard_from: heardFrom || null,
          signup_purpose: purpose || null,
        }).eq("user_id", newUser.id);

        // Handle referral code
        const codeToUse = referralCode.trim() || refCode;
        if (codeToUse) {
          await supabase.from("referrals").update({
            referred_user_id: newUser.id,
            status: "completed"
          }).eq("referral_code", codeToUse).eq("status", "pending");
        }
      }
    }, 2000);

    toast({ title: "Check your email!", description: "We sent you a 6-digit verification code." });
    navigate("/verify-email");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="absolute right-4 top-4 z-10"><ThemeToggle /></div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-foreground">
        <Zap className="h-72 w-72 text-primary" />
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px] space-y-6">
          <div>
            <Zap className="h-10 w-10 text-primary mb-6" />
            <h1 className="font-display text-3xl font-bold tracking-tight leading-tight">
              {isLogin ? "Sign in to X-TWITTER" : step === 1 ? "Join X-TWITTER today" : "Tell us about you"}
            </h1>
            {!isLogin && step === 2 && (
              <p className="text-sm text-muted-foreground mt-2">Just a few quick questions to personalize your experience</p>
            )}
          </div>

          {/* Step 1: Login or basic signup */}
          {(isLogin || step === 1) && (
            <form onSubmit={handleStep1} className="space-y-3">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-[14px]">Name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="h-11 rounded-lg text-[14px]" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[14px]">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-11 rounded-lg text-[14px]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[14px]">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-11 rounded-lg text-[14px]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} className="mt-1" />
                  <label htmlFor="terms" className="text-[12px] text-muted-foreground leading-tight cursor-pointer">
                    I agree to the{" "}
                    <Link to="/dashboard/terms" className="text-primary hover:underline" target="_blank">Terms of Service</Link>{" "}
                    and{" "}
                    <Link to="/dashboard/privacy" className="text-primary hover:underline" target="_blank">Privacy Policy</Link>
                  </label>
                </div>
              )}

              {isLogin && (
                <Link to="/forgot-password" className="text-sm text-primary hover:underline block">
                  Forgot password?
                </Link>
              )}

              {refCode && !isLogin && (
                <div className="flex items-center gap-2 p-2.5 bg-success/10 rounded-xl border border-success/20">
                  <span className="text-sm text-success font-medium">🎉 Invited! Referral: {refCode}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-11 rounded-full bg-foreground text-background hover:bg-foreground/90 font-bold text-[15px]" disabled={loading || (!isLogin && !acceptedTerms)}>
                {loading ? "Please wait..." : isLogin ? "Sign in" : "Next →"}
              </Button>
            </form>
          )}

          {/* Step 2: Additional questions */}
          {!isLogin && step === 2 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[14px]">Referral code (optional)</Label>
                <Input
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="h-11 rounded-lg text-[14px] uppercase tracking-widest"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[14px]">Where did you hear about us?</Label>
                <Select value={heardFrom} onValueChange={setHeardFrom}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select an option" /></SelectTrigger>
                  <SelectContent>
                    {HEARD_FROM_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[14px]">What are you here for?</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select your purpose" /></SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[14px]">Your category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="What describes you best?" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 rounded-full font-bold">
                  ← Back
                </Button>
                <Button onClick={handleSignup} disabled={loading} className="flex-1 h-11 rounded-full bg-foreground text-background hover:bg-foreground/90 font-bold text-[15px]">
                  {loading ? "Creating..." : "Create account"}
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
              </div>

              <Button variant="outline" className="w-full h-11 rounded-full font-bold text-[15px]" disabled>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign in with Google
              </Button>

              <p className="text-center text-[14px] text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => { setIsLogin(!isLogin); setStep(1); }} className="text-primary hover:underline font-medium">
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
