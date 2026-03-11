import { useNavigate } from "react-router-dom";
import { ArrowLeft, Monitor, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const DisplayPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Display</h1>
      </div>
      <div className="p-4 space-y-6">
        <div>
          <h2 className="font-display font-bold text-[17px] mb-4">Theme</h2>
          <div className="space-y-3">
            {([["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor]] as const).map(([val, label, Icon]) => (
              <button key={val} onClick={() => setTheme(val)} className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors ${theme === val ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                <Icon className="h-5 w-5" />
                <span className="font-medium text-[15px]">{label}</span>
                {theme === val && <div className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-primary-foreground" /></div>}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-border pt-6">
          <h2 className="font-display font-bold text-[17px] mb-4">Accessibility</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between"><Label>Reduce motion</Label><Switch /></div>
            <div className="flex items-center justify-between"><Label>High contrast</Label><Switch /></div>
            <div className="flex items-center justify-between"><Label>Large text</Label><Switch /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplayPage;
