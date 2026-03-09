import { Link, useLocation } from "react-router-dom";
import { Home, Search, Bell, Mail, User } from "lucide-react";

interface MobileBottomNavProps {
  unreadNotifs: number;
  unreadMessages: number;
}

const MobileBottomNav = ({ unreadNotifs, unreadMessages }: MobileBottomNavProps) => {
  const location = useLocation();

  const items = [
    { icon: Home, path: "/dashboard", label: "Home" },
    { icon: Search, path: "/dashboard/search", label: "Search" },
    { icon: Bell, path: "/dashboard/notifications", label: "Notifications", badge: unreadNotifs },
    { icon: Mail, path: "/dashboard/messages", label: "Messages", badge: unreadMessages },
    { icon: User, path: "/dashboard/profile", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border lg:hidden safe-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map(item => {
          const isActive = item.path === "/dashboard"
            ? location.pathname === "/dashboard"
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-center w-14 h-14 relative ${isActive ? "text-foreground" : "text-muted-foreground"}`}
            >
              <item.icon className={`h-6 w-6 ${isActive ? "stroke-[2.5]" : ""}`} />
              {(item.badge ?? 0) > 0 && (
                <span className="absolute top-2 right-1.5 h-[16px] min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {item.badge! > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
