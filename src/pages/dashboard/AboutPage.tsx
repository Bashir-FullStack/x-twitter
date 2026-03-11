import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Globe, Shield, Heart } from "lucide-react";

const AboutPage = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">About</h1>
      </div>
      <div className="p-6 space-y-8">
        <div className="text-center">
          <Zap className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold">Platform</h2>
          <p className="text-muted-foreground mt-1">Version 1.0.0</p>
        </div>
        <div className="space-y-4">
          {[{ icon: Globe, title: "Open Platform", desc: "A social network built for everyone" }, { icon: Shield, title: "Privacy First", desc: "Your data belongs to you" }, { icon: Heart, title: "Community Driven", desc: "Built by and for the community" }].map(item => (
            <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
              <item.icon className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div><p className="font-bold text-[15px]">{item.title}</p><p className="text-[13px] text-muted-foreground">{item.desc}</p></div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Platform. All rights reserved.</p>
      </div>
    </div>
  );
};

export default AboutPage;
