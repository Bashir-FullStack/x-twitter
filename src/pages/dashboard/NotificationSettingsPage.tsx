import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const NotificationSettingsPage = () => {
  const navigate = useNavigate();
  const items = [
    { label: "Likes", desc: "When someone likes your post" },
    { label: "Comments", desc: "When someone comments on your post" },
    { label: "New followers", desc: "When someone follows you" },
    { label: "Mentions", desc: "When someone mentions you" },
    { label: "Reposts", desc: "When someone reposts your content" },
    { label: "Messages", desc: "New direct messages" },
    { label: "Admin broadcasts", desc: "System announcements" },
    { label: "Group activity", desc: "Updates from your communities" },
  ];

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Notification Settings</h1>
      </div>
      <div className="divide-y divide-border">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between px-4 py-4">
            <div><p className="text-[15px] font-medium">{item.label}</p><p className="text-[13px] text-muted-foreground">{item.desc}</p></div>
            <Switch defaultChecked />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
