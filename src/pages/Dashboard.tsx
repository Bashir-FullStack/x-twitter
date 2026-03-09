import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, MessageSquare, TrendingUp, Bell, Shield, Activity, Eye } from "lucide-react";

const stats = [
  { label: "Total Views", value: "2,847", icon: Eye, change: "+12.5%" },
  { label: "Content", value: "142", icon: FileText, change: "+3.2%" },
  { label: "Messages", value: "38", icon: MessageSquare, change: "+8.1%" },
  { label: "Engagement", value: "94%", icon: TrendingUp, change: "+2.4%" },
];

const recentActivity = [
  { text: "Profile updated successfully", time: "2 min ago", icon: Users },
  { text: "New notification received", time: "15 min ago", icon: Bell },
  { text: "Security check completed", time: "1 hour ago", icon: Shield },
  { text: "Content published", time: "3 hours ago", icon: FileText },
  { text: "System performance nominal", time: "5 hours ago", icon: Activity },
];

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
          Welcome back{user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">Here's what's happening with your account.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold font-display">{stat.value}</p>
                <p className="text-xs text-success">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: "Create Content", icon: FileText },
              { label: "Send Message", icon: MessageSquare },
              { label: "View Analytics", icon: TrendingUp },
              { label: "Security Check", icon: Shield },
              { label: "Notifications", icon: Bell },
              { label: "Edit Profile", icon: Users },
            ].map((action) => (
              <button
                key={action.label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/50 p-4 text-center transition-colors hover:bg-muted"
              >
                <action.icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
