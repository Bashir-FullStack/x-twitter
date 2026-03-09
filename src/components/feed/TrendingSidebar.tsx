import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TrendingItem {
  name: string;
  post_count: number;
}

interface NewsItem {
  title: string;
  category: string;
  time: string;
  posts: string;
}

const TrendingSidebar = () => {
  const navigate = useNavigate();
  const [trends, setTrends] = useState<TrendingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNews, setShowNews] = useState(true);

  // Simulated news — in production this would come from an API
  const news: NewsItem[] = [
    { title: "Welcome to the Platform", category: "Platform", time: "Just now", posts: "New" },
  ];

  useEffect(() => {
    supabase
      .from("hashtags")
      .select("name, post_count")
      .order("post_count", { ascending: false })
      .limit(10)
      .then(({ data }) => setTrends(data || []));
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-10"
        />
      </div>

      {/* Today's News */}
      {showNews && news.length > 0 && (
        <Card className="border-border/50 bg-muted/30 overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl font-extrabold">Today's News</CardTitle>
            <button onClick={() => setShowNews(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {news.map((item, i) => (
              <div key={i} className="cursor-pointer hover:bg-muted/50 -mx-3 px-3 py-2 rounded-lg transition-colors">
                <p className="font-bold text-[15px] leading-tight">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.time} · {item.category} · {item.posts}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* What's happening / Trending */}
      <Card className="border-border/50 bg-muted/30 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-xl font-extrabold">What's happening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0 -mx-3 px-0">
          {trends.length > 0 ? (
            trends.map((trend) => (
              <div key={trend.name} className="cursor-pointer hover:bg-muted/50 px-6 py-2.5 transition-colors">
                <p className="text-[13px] text-muted-foreground">Trending</p>
                <p className="font-bold text-[15px]">#{trend.name}</p>
                <p className="text-[13px] text-muted-foreground">{trend.post_count.toLocaleString()} posts</p>
              </div>
            ))
          ) : (
            <div className="text-center py-6 px-6">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No trends yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Post with #hashtags to start trending!</p>
            </div>
          )}
          {trends.length > 0 && (
            <button className="w-full text-left px-6 py-3 text-sm text-primary hover:bg-muted/50 transition-colors">
              Show more
            </button>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default TrendingSidebar;
