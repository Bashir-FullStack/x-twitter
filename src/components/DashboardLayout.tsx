import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard, User, Settings, Bell, Search, MessageSquare,
  FileText, Shield, BarChart3, LogOut, Menu, X, Zap, ChevronDown,
  Users, ShieldAlert, Bookmark, Hash, UserPlus, MoreHorizontal, Feather
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator } = useRole();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
    { icon: Search, label: "Explore", path: "/dashboard/search" },
    { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
    { icon: MessageSquare, label: "Messages", path: "/dashboard/messages" },
    { icon: Bookmark, label: "Bookmarks", path: "/dashboard/bookmarks" },
    { icon: Users, label: "Communities", path: "/dashboard/groups" },
    { icon: FileText, label: "My Posts", path: "/dashboard/content" },
    { icon: User, label: "Profile", path: "/dashboard/profile" },
    { icon: Shield, label: "Security", path: "/dashboard/security" },
    { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
    ...(isAdmin || isModerator ? [{ icon: ShieldAlert, label: "Admin", path: "/dashboard/admin" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[68px] xl:w-64 transform bg-background border-r border-border transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0 !w-64" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="flex h-14 items-center px-3 xl:px-5">
          <Link to="/dashboard" className="flex items-center gap-2 p-2 rounded-full hover:bg-muted transition-colors">
            <Zap className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold hidden xl:inline">Platform</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2 xl:px-3 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 rounded-full px-3 py-3 text-[15px] transition-colors ${
                  isActive
                    ? "font-bold text-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
                title={item.label}
              >
                <item.icon className={`h-[26px] w-[26px] shrink-0 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}

          {/* More */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-4 rounded-full px-3 py-3 text-[15px] text-foreground hover:bg-muted w-full">
              <MoreHorizontal className="h-[26px] w-[26px] shrink-0" />
              <span className="hidden xl:inline">More</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem asChild><Link to="/dashboard/security">Security & Privacy</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/dashboard/analytics">Analytics</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/dashboard/settings">Settings</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Post button */}
        <div className="p-3 xl:px-4">
          <Link to="/dashboard">
            <Button className="w-full gradient-primary text-primary-foreground rounded-full h-[52px] font-bold text-[17px] hidden xl:flex">
              Post
            </Button>
            <Button className="xl:hidden gradient-primary text-primary-foreground rounded-full h-[52px] w-[52px] p-0 flex items-center justify-center mx-auto">
              <Feather className="h-6 w-6" />
            </Button>
          </Link>
        </div>

        {/* User menu at bottom */}
        <div className="p-3 xl:px-4 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-full p-2 xl:p-3 hover:bg-muted transition-colors w-full">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="hidden xl:block flex-1 min-w-0 text-left">
                <p className="text-sm font-bold truncate">{user?.user_metadata?.display_name || user?.email?.split("@")[0]}</p>
                <p className="text-xs text-muted-foreground truncate">@{user?.email?.split("@")[0]}</p>
              </div>
              <MoreHorizontal className="h-5 w-5 text-muted-foreground hidden xl:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-bold">{user?.user_metadata?.display_name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/dashboard/profile">Profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/dashboard/bookmarks">Bookmarks</Link></DropdownMenuItem>
              {isAdmin && (<DropdownMenuItem asChild><Link to="/dashboard/admin">Admin Panel</Link></DropdownMenuItem>)}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <Zap className="h-6 w-6 text-primary" />
          <ThemeToggle />
        </header>

        <main className="flex-1 border-r border-border max-w-[600px] lg:max-w-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
