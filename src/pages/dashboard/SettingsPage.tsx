import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Moon, Sun, Bell, Globe, Eye, Palette, Monitor, ChevronRight,
  User, Shield, Lock, Smartphone, LogOut, Trash2, Download, Languages,
  Accessibility, HelpCircle, Flag, Heart, Volume2, Wifi, Type, VolumeX,
  FileText, AlertTriangle
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fontSize, setFontSize] = useState(16);
  const [language, setLanguage] = useState("en");
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPlayVideos, setAutoPlayVideos] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [mutedWordsDialog, setMutedWordsDialog] = useState(false);
  const [mutedWords, setMutedWords] = useState("");
  const [mutedWordsList, setMutedWordsList] = useState<string[]>([]);
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sensitiveContent, setSensitiveContent] = useState(false);
  const [directMessages, setDirectMessages] = useState(true);
  const [tagging, setTagging] = useState(true);
  const [discoverableEmail, setDiscoverableEmail] = useState(false);

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    const [profileRes, postsRes, followersRes, followingRes, bookmarksRes, messagesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("posts").select("*").eq("user_id", user.id),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("follows").select("follower_id").eq("following_id", user.id),
      supabase.from("bookmarks").select("post_id").eq("user_id", user.id),
      supabase.from("messages").select("*").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(500),
    ]);
    const data = {
      exported_at: new Date().toISOString(),
      profile: profileRes.data,
      posts: postsRes.data,
      followers_count: followingRes.data?.length || 0,
      following_count: followersRes.data?.length || 0,
      bookmarks_count: bookmarksRes.data?.length || 0,
      messages_count: messagesRes.data?.length || 0,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `my-data-${new Date().toISOString().split("T")[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast({ title: "Data exported successfully" });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    toast({ title: "Account deactivation requested", description: "Your account will be deactivated. Contact support to complete deletion." });
    setDeleteAccountDialog(false);
    signOut();
  };

  const addMutedWord = () => {
    if (!mutedWords.trim()) return;
    const words = mutedWords.split(",").map(w => w.trim()).filter(Boolean);
    setMutedWordsList(prev => [...new Set([...prev, ...words])]);
    setMutedWords("");
    toast({ title: `${words.length} word(s) muted` });
  };

  const removeMutedWord = (word: string) => {
    setMutedWordsList(prev => prev.filter(w => w !== word));
  };

  const sections = [
    {
      title: "Your account",
      items: [
        { icon: User, label: "Account information", desc: "See your account information", path: "/dashboard/account-info" },
        { icon: Lock, label: "Change your password", desc: "Change your password at any time", path: "/dashboard/security" },
        { icon: Download, label: "Download your data", desc: "Get a copy of all your data", path: "/dashboard/data-export" },
        { icon: Trash2, label: "Deactivate your account", desc: "Permanently deactivate your account", danger: true, path: "/dashboard/deactivate" },
      ],
    },
    {
      title: "Privacy and safety",
      items: [
        { icon: Shield, label: "Privacy settings", desc: "Manage what information you share", path: "/dashboard/privacy" },
        { icon: Eye, label: "Muted & blocked", desc: "Manage muted and blocked accounts", path: "/dashboard/muted-blocked" },
        { icon: VolumeX, label: "Muted words", desc: `${mutedWordsList.length} word(s) muted`, action: () => setMutedWordsDialog(true) },
        { icon: Flag, label: "My reports", desc: "View your submitted reports", path: "/dashboard/reports" },
      ],
    },
    {
      title: "Notifications",
      items: [
        { icon: Bell, label: "Notification preferences", desc: "Customize all notifications", path: "/dashboard/notification-settings" },
        { icon: Volume2, label: "Notification sounds", desc: "Play sounds for notifications", toggle: true, checked: soundEnabled, onToggle: () => { setSoundEnabled(!soundEnabled); toast({ title: soundEnabled ? "Sounds disabled" : "Sounds enabled" }); } },
      ],
    },
    {
      title: "Display and accessibility",
      items: [
        { icon: theme === "dark" ? Moon : Sun, label: "Display", desc: "Theme, font size, and colors", path: "/dashboard/display" },
        { icon: Accessibility, label: "Accessibility", desc: "Vision, motion, and reading options", path: "/dashboard/accessibility" },
        { icon: Palette, label: "Auto-play videos", desc: "Automatically play videos in feed", toggle: true, checked: autoPlayVideos, onToggle: () => setAutoPlayVideos(!autoPlayVideos) },
        { icon: Wifi, label: "Data saver", desc: "Lower data usage on cellular", toggle: true, checked: dataSaver, onToggle: () => { setDataSaver(!dataSaver); toast({ title: dataSaver ? "Data saver off" : "Data saver on" }); } },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Eye, label: "Read receipts", desc: "Let others see when you read messages", toggle: true, checked: readReceipts, onToggle: () => setReadReceipts(!readReceipts) },
        { icon: Heart, label: "Show online status", desc: "Let people see when you're online", toggle: true, checked: showOnline, onToggle: () => setShowOnline(!showOnline) },
        { icon: Smartphone, label: "Direct messages", desc: "Allow DMs from anyone", toggle: true, checked: directMessages, onToggle: () => setDirectMessages(!directMessages) },
        { icon: User, label: "Allow tagging", desc: "Let others tag you in posts", toggle: true, checked: tagging, onToggle: () => setTagging(!tagging) },
        { icon: AlertTriangle, label: "Show sensitive content", desc: "View posts that may contain sensitive media", toggle: true, checked: sensitiveContent, onToggle: () => setSensitiveContent(!sensitiveContent) },
        { icon: Lock, label: "Two-factor authentication", desc: "Extra security for your account", toggle: true, checked: twoFactor, onToggle: () => { setTwoFactor(!twoFactor); toast({ title: twoFactor ? "2FA disabled" : "2FA enabled" }); } },
        { icon: Globe, label: "Email discoverable", desc: "Let others find you by email", toggle: true, checked: discoverableEmail, onToggle: () => setDiscoverableEmail(!discoverableEmail) },
      ],
    },
    {
      title: "Font size",
      slider: true,
    },
    {
      title: "Language",
      language: true,
    },
    {
      title: "Resources",
      items: [
        { icon: HelpCircle, label: "Help Center", desc: "Find answers to your questions", path: "/dashboard/help" },
        { icon: FileText, label: "Terms of Service", desc: "Read our terms", path: "/dashboard/terms" },
        { icon: Shield, label: "Privacy Policy", desc: "Read our privacy policy", path: "/dashboard/privacy" },
        { icon: Heart, label: "About Platform", desc: "Learn more about us", path: "/dashboard/about" },
        { icon: Globe, label: "Connected apps", desc: "Manage third-party connections", path: "/dashboard/connected-apps" },
      ],
    },
  ];

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center px-4 border-b border-border">
        <h1 className="font-display text-xl font-bold">Settings</h1>
      </div>

      <div className="divide-y divide-border">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-[13px] font-semibold text-muted-foreground px-4 pt-4 pb-2">{section.title}</h2>
            
            {/* Font size slider */}
            {section.slider && (
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[15px]">Font size</span>
                  </div>
                  <span className="text-sm font-medium text-primary">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs">A</span>
                  <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={12} max={24} step={1} className="flex-1" />
                  <span className="text-lg font-bold">A</span>
                </div>
                <p className="text-[15px] bg-muted/50 p-3 rounded-xl" style={{ fontSize: `${fontSize}px` }}>
                  Preview text at {fontSize}px
                </p>
              </div>
            )}

            {/* Language selector */}
            {section.language && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-4">
                  <Languages className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-[15px]">Language</p>
                    <p className="text-[13px] text-muted-foreground">Select your preferred language</p>
                  </div>
                  <Select value={language} onValueChange={v => { setLanguage(v); toast({ title: `Language set to ${v === "en" ? "English" : v === "es" ? "Spanish" : v === "fr" ? "French" : v === "ar" ? "Arabic" : v === "zh" ? "Chinese" : v === "hi" ? "Hindi" : v}` }); }}>
                    <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="hi">हिन्दी</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {section.items?.map((item) => (
              <button
                key={item.label}
                onClick={() => item.action ? item.action() : item.path ? navigate(item.path) : item.onToggle?.()}
                className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left ${item.danger ? "text-destructive" : ""}`}
              >
                <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] ${item.danger ? "text-destructive" : ""}`}>{item.label}</p>
                  <p className="text-[13px] text-muted-foreground line-clamp-1">{item.desc}</p>
                </div>
                {item.toggle ? (
                  <Switch checked={item.checked} onCheckedChange={item.onToggle} onClick={(e) => e.stopPropagation()} />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        ))}

        {/* Logout */}
        <div className="p-4">
          <Button variant="outline" className="w-full rounded-full text-destructive border-destructive/30 hover:bg-destructive/5" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Log out
          </Button>
        </div>
      </div>

      {/* Muted Words Dialog */}
      <Dialog open={mutedWordsDialog} onOpenChange={setMutedWordsDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Muted Words</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Posts containing these words will be hidden from your feed.</p>
          <div className="flex gap-2">
            <Input value={mutedWords} onChange={e => setMutedWords(e.target.value)} placeholder="Add words (comma separated)" className="flex-1" onKeyDown={e => e.key === "Enter" && addMutedWord()} />
            <Button onClick={addMutedWord} className="rounded-full gradient-primary text-primary-foreground">Add</Button>
          </div>
          {mutedWordsList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {mutedWordsList.map(word => (
                <span key={word} className="inline-flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm">
                  {word}
                  <button onClick={() => removeMutedWord(word)} className="text-muted-foreground hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}
          {mutedWordsList.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No muted words yet</p>}
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountDialog} onOpenChange={setDeleteAccountDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive">Deactivate Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="font-bold text-destructive">Warning</span>
              </div>
              <p className="text-sm text-muted-foreground">This will permanently deactivate your account. Your posts and data will be removed. This action cannot be undone.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Type DELETE to confirm</Label>
              <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
            </div>
            <Button onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE"} variant="destructive" className="w-full rounded-full">
              Deactivate my account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
