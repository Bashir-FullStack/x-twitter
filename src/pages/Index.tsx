import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { Zap } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - giant logo */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-foreground">
        <Zap className="h-[380px] w-[380px] text-primary" />
      </div>

      {/* Right side - CTA */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[440px]">
          <div className="absolute right-6 top-6">
            <ThemeToggle />
          </div>

          <Zap className="h-12 w-12 text-primary mb-10 lg:hidden" />

          <h1 className="font-display text-[40px] sm:text-[64px] font-extrabold leading-[1.05] tracking-tight mb-12">
            Happening now
          </h1>

          <h2 className="font-display text-[23px] sm:text-[31px] font-bold mb-8">
            Join today.
          </h2>

          <div className="space-y-3 max-w-[300px]">
            <Button variant="outline" className="w-full h-11 rounded-full font-semibold text-[15px] gap-2" disabled>
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign up with Google
            </Button>

            <Button variant="outline" className="w-full h-11 rounded-full font-bold text-[15px] gap-2" disabled>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Sign up with Apple
            </Button>

            <div className="flex items-center gap-2 py-1">
              <span className="flex-1 border-t border-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <span className="flex-1 border-t border-border" />
            </div>

            <Button asChild className="w-full h-11 rounded-full gradient-primary text-primary-foreground font-bold text-[15px]">
              <Link to="/auth">Create account</Link>
            </Button>

            <p className="text-[11px] text-muted-foreground leading-tight">
              By signing up, you agree to the{" "}
              <Link to="/dashboard/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
              and{" "}
              <Link to="/dashboard/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              , including{" "}
              <span className="text-primary">Cookie Use</span>.
            </p>
          </div>

          <div className="mt-16 max-w-[300px]">
            <p className="font-display font-bold text-[17px] mb-5">Already have an account?</p>
            <Button variant="outline" asChild className="w-full h-11 rounded-full text-primary border-primary/30 font-bold text-[15px] hover:bg-primary/5">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground max-w-[380px]">
            <Link to="/dashboard/terms" className="hover:underline">Terms of Service</Link>
            <Link to="/dashboard/privacy" className="hover:underline">Privacy Policy</Link>
            <span className="hover:underline cursor-pointer">Cookie Policy</span>
            <span className="hover:underline cursor-pointer">Accessibility</span>
            <span className="hover:underline cursor-pointer">Ads info</span>
            <span className="hover:underline cursor-pointer">Blog</span>
            <span className="hover:underline cursor-pointer">Careers</span>
            <span>© 2026 Platform Corp.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
