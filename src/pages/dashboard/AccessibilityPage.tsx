import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const AccessibilityPage = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Accessibility</h1>
      </div>
      <div className="p-4 space-y-6">
        <div className="space-y-4">
          <h2 className="font-display font-bold text-[17px]">Vision</h2>
          <div className="flex items-center justify-between"><Label>Increase color contrast</Label><Switch /></div>
          <div className="flex items-center justify-between"><Label>Reduce transparency</Label><Switch /></div>
          <div><Label>Font size</Label><Slider defaultValue={[16]} min={12} max={24} step={1} className="mt-3" /></div>
        </div>
        <div className="space-y-4 border-t border-border pt-6">
          <h2 className="font-display font-bold text-[17px]">Motion</h2>
          <div className="flex items-center justify-between"><Label>Reduce motion</Label><Switch /></div>
          <div className="flex items-center justify-between"><Label>Auto-play videos</Label><Switch defaultChecked /></div>
        </div>
        <div className="space-y-4 border-t border-border pt-6">
          <h2 className="font-display font-bold text-[17px]">Reading</h2>
          <div className="flex items-center justify-between"><Label>Show alt text</Label><Switch defaultChecked /></div>
          <div className="flex items-center justify-between"><Label>Dyslexia-friendly font</Label><Switch /></div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityPage;
