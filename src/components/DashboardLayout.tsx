import { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import ThemeToggle from "@/components/ThemeToggle";
import MobileBottomNav from "@/components/MobileBottomNav";
import TermsComplianceCheck from "@/components/TermsComplianceCheck";
import {
  User, Settings, Bell, Search, Mail,
  FileText, Shield, BarChart3, LogOut, X, Zap,
  Users, ShieldAlert, Bookmark, MoreHorizontal, Feather, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [myProfile, setMyProfile] = useState<any>(null);
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator } = useRole();
  const location = useLocation();
  usePresence();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false),
      supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).single(),
    ]).then(([notifs, msgs, profile]) => {
      setUnreadNotifs(notifs.count || 0);
      setUnreadMessages(msgs.count || 0);
      setMyProfile(profile.data);
    });

    const channel = supabase.channel("layout-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => setUnreadNotifs(c => c + 1))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, () => setUnreadMessages(c => c + 1))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard", badge: 0 },
    { icon: Search, label: "Explore", path: "/dashboard/search", badge: 0 },
    { icon: Bell, label: "Notifications", path: "/dashboard/notifications", badge: unreadNotifs },
    { icon: Mail, label: "Messages", path: "/dashboard/messages", badge: unreadMessages },
    { icon: Bookmark, label: "Bookmarks", path: "/dashboard/bookmarks", badge: 0 },
    { icon: Users, label: "Communities", path: "/dashboard/groups", badge: 0 },
    { icon: User, label: "Profile", path: "/dashboard/profile", badge: 0 },
    ...(isAdmin || isModerator ? [{ icon: ShieldAlert, label: "Admin", path: "/dashboard/admin", badge: 0 }] : []),
  ];

  const moreItems = [
    { icon: FileText, label: "My Posts", path: "/dashboard/content" },
    { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
    { icon: Shield, label: "Security", path: "/dashboard/security" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
    { icon: Feather, label: "Drafts", path: "/dashboard/drafts" },
    { icon: Zap, label: "Verification", path: "/dashboard/verification" },
    { icon: Home, label: "Achievements", path: "/dashboard/achievements" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[72px] xl:w-[275px] transform bg-background border-r border-border transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0 !w-[275px]" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex h-14 items-center px-3 xl:px-4">
            <Link to="/dashboard" className="flex items-center gap-2.5 p-3 rounded-full hover:bg-muted transition-colors">
              <Zap className="h-7 w-7 text-primary" />
              <span className="font-display text-xl font-bold hidden xl:inline">X-TWITTER</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-foreground p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-0.5 px-2 xl:px-3 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = item.path === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(item.path);
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-5 rounded-full px-3 py-3 text-[15px] transition-all duration-150 group relative ${
                        isActive ? "font-bold text-foreground" : "text-foreground/80 hover:bg-muted"
                      }`}
                    >
                      <div className="relative">
                        <item.icon className={`h-[26px] w-[26px] shrink-0 ${isActive ? "stroke-[2.5]" : ""}`} />
                        {item.badge > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </div>
                      <span className="hidden xl:inline">{item.label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="xl:hidden">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}

            <DropdownMenu>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger className="flex items-center gap-5 rounded-full px-3 py-3 text-[15px] text-foreground/80 hover:bg-muted w-full transition-colors">
                    <MoreHorizontal className="h-[26px] w-[26px] shrink-0" />
                    <span className="hidden xl:inline">More</span>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="xl:hidden">More</TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="top" align="start" className="w-64 p-1">
                {moreItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild className="gap-3 py-3 px-4 rounded-lg">
                    <Link to={item.path} onClick={() => setSidebarOpen(false)}>
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive gap-3 py-3 px-4 rounded-lg">
                  <LogOut className="h-5 w-5" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Post button */}
          <div className="p-3 xl:px-4">
            <Link to="/dashboard">
              <Button className="w-full gradient-primary text-primary-foreground rounded-full h-[52px] font-bold text-[17px] hidden xl:flex shadow-glow hover:opacity-90 transition-opacity">
                Post
              </Button>
              <Button className="xl:hidden gradient-primary text-primary-foreground rounded-full h-[52px] w-[52px] p-0 flex items-center justify-center mx-auto shadow-glow hover:opacity-90 transition-opacity">
                <Feather className="h-6 w-6" />
              </Button>
            </Link>
          </div>

          {/* User menu */}
          <div className="p-3 xl:px-4 pb-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 rounded-full p-2 xl:p-3 hover:bg-muted transition-colors w-full">
                <UserAvatar
                  avatarUrl={myProfile?.avatar_url}
                  displayName={myProfile?.display_name || user?.email}
                  className="h-10 w-10 shrink-0"
                />
                <div className="hidden xl:block flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold truncate">{myProfile?.display_name || user?.email?.split("@")[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user?.email?.split("@")[0]}</p>
                </div>
                <MoreHorizontal className="h-5 w-5 text-muted-foreground hidden xl:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-64 p-1">
                <div className="px-4 py-3">
                  <p className="text-sm font-bold">{myProfile?.display_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-3 py-2.5 px-4 rounded-lg">
                  <Link to="/dashboard/profile"><User className="h-4 w-4" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-3 py-2.5 px-4 rounded-lg">
                  <Link to="/dashboard/settings"><Settings className="h-4 w-4" /> Settings</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild className="gap-3 py-2.5 px-4 rounded-lg">
                    <Link to="/dashboard/admin"><ShieldAlert className="h-4 w-4" /> Admin Panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive gap-3 py-2.5 px-4 rounded-lg">
                  <LogOut className="h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-[53px] items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <UserAvatar
              avatarUrl={myProfile?.avatar_url}
              displayName={myProfile?.display_name || user?.email}
              className="h-8 w-8"
            />
          </button>
          <Zap className="h-6 w-6 text-primary" />
          <ThemeToggle />
        </header>

        <main className="flex-1 pb-14 lg:pb-0">
          <TermsComplianceCheck />
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav unreadNotifs={unreadNotifs} unreadMessages={unreadMessages} />
    </div>
  );
};

export default DashboardLayout;
