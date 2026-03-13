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

const TrendingSidebar = () => {
  const navigate = useNavigate();
  const [trends, setTrends] = useState<TrendingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Only show hashtags used by 5+ people, max 5, sorted by most used
    supabase
      .from("hashtags")
      .select("name, post_count")
      .gte("post_count", 5)
      .order("post_count", { ascending: false })
      .limit(5)
      .then(({ data }) => setTrends(data || []));
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
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

      <Card className="border-border/50 bg-muted/30 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-xl font-extrabold">What's happening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0 -mx-3 px-0">
          {trends.length > 0 ? (
            trends.map((trend) => (
              <div key={trend.name} className="cursor-pointer hover:bg-muted/50 px-6 py-2.5 transition-colors" onClick={() => navigate(`/dashboard/search?q=%23${trend.name}`)}>
                <p className="text-[13px] text-muted-foreground">Trending</p>
                <p className="font-bold text-[15px]">#{trend.name}</p>
                <p className="text-[13px] text-muted-foreground">{trend.post_count.toLocaleString()} posts</p>
              </div>
            ))
          ) : (
            <div className="text-center py-6 px-6">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No trends yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Hashtags with 5+ uses will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default TrendingSidebar;
