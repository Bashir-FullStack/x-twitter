import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TrendingItem {
  name: string;
  post_count: number;
}

const TrendingSidebar = () => {
  const [trends, setTrends] = useState<TrendingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase
      .from("hashtags")
      .select("name, post_count")
      .order("post_count", { ascending: false })
      .limit(10)
      .then(({ data }) => setTrends(data || []));
  }, []);

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      {/* Trending */}
      <Card className="border-border/50 bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg">What's happening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {trends.length > 0 ? (
            trends.map((trend) => (
              <div key={trend.name} className="cursor-pointer hover:bg-muted/50 -mx-3 px-3 py-1 rounded-lg transition-colors">
                <p className="text-xs text-muted-foreground">Trending</p>
                <p className="font-semibold text-sm">#{trend.name}</p>
                <p className="text-xs text-muted-foreground">{trend.post_count.toLocaleString()} posts</p>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No trends yet</p>
              <p className="text-xs text-muted-foreground">Start posting with #hashtags!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default TrendingSidebar;
