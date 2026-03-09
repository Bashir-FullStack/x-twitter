import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Moon, Sun, Bell, Globe, Eye, Palette, Monitor, ChevronRight,
  User, Shield, Lock, Smartphone, LogOut, Trash2, Download, Languages,
  Accessibility, HelpCircle, Flag, Heart, Volume2, Wifi
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const sections = [
    {
      title: "Your account",
      items: [
        { icon: User, label: "Account information", desc: "See your account information like your email address and phone number", path: "/dashboard/profile" },
        { icon: Lock, label: "Change your password", desc: "Change your password at any time", path: "/dashboard/security" },
        { icon: Download, label: "Download your data", desc: "Get a copy of your data" },
        { icon: Trash2, label: "Deactivate your account", desc: "Find out how you can deactivate your account", danger: true },
      ],
    },
    {
      title: "Privacy and safety",
      items: [
        { icon: Shield, label: "Privacy settings", desc: "Manage what information you share" },
        { icon: Eye, label: "Content you see", desc: "Decide what you see on the platform based on your preferences" },
        { icon: Volume2, label: "Mute and block", desc: "Manage the accounts and words that you've muted or blocked" },
        { icon: Flag, label: "Report a problem", desc: "Report inappropriate content or behavior" },
      ],
    },
    {
      title: "Notifications",
      items: [
        { icon: Bell, label: "Push notifications", desc: "Manage your mobile and desktop notifications", toggle: true, defaultChecked: true },
        { icon: Smartphone, label: "Email notifications", desc: "Get email updates about activity", toggle: true, defaultChecked: true },
      ],
    },
    {
      title: "Accessibility, display, and languages",
      items: [
        { icon: Accessibility, label: "Accessibility", desc: "Manage accessibility features like font size and color contrast" },
        { icon: theme === "dark" ? Moon : Sun, label: "Display", desc: `Currently using ${theme} mode`, toggle: true, checked: theme === "dark", onToggle: toggleTheme },
        { icon: Languages, label: "Languages", desc: "Select your preferred languages" },
      ],
    },
    {
      title: "Additional resources",
      items: [
        { icon: HelpCircle, label: "Help Center", desc: "Find answers to your questions" },
        { icon: Heart, label: "About", desc: "Learn more about Platform" },
      ],
    },
  ];

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center px-4 border-b border-border">
        <h1 className="font-display text-xl font-bold">Settings</h1>
      </div>

      <div className="divide-y divide-border">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-[13px] font-semibold text-muted-foreground px-4 pt-4 pb-2">{section.title}</h2>
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={() => item.path ? navigate(item.path) : item.onToggle?.()}
                className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left ${item.danger ? "text-destructive" : ""}`}
              >
                <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] ${item.danger ? "text-destructive" : ""}`}>{item.label}</p>
                  <p className="text-[13px] text-muted-foreground line-clamp-1">{item.desc}</p>
                </div>
                {item.toggle ? (
                  <Switch
                    checked={item.checked ?? item.defaultChecked}
                    onCheckedChange={item.onToggle}
                    onClick={(e) => e.stopPropagation()}
                  />
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
    </div>
  );
};

export default SettingsPage;
