import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, User, Users as UsersIcon, Clock, TrendingUp, Hash, X } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useToast } from "@/hooks/use-toast";

const SearchPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [results, setResults] = useState<{ posts: any[]; users: any[]; groups: any[] }>({ posts: [], users: [], groups: [] });
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingTags, setTrendingTags] = useState<{ name: string; post_count: number }[]>([]);

  // Load trending on mount
  useState(() => {
    supabase.from("hashtags").select("name, post_count").order("post_count", { ascending: false }).limit(10).then(({ data }) => {
      setTrendingTags(data || []);
    });
  });

  const doSearch = async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);

    if (!recentSearches.includes(searchQuery)) {
      setRecentSearches((prev) => [searchQuery, ...prev.slice(0, 4)]);
    }

    const [postsRes, usersRes, groupsRes, followsRes] = await Promise.all([
      supabase.from("posts").select("id, title, body, status, category, created_at, user_id, likes_count, views_count").ilike("title", `%${searchQuery}%`).eq("status", "published").limit(20),
      supabase.from("profiles").select("user_id, display_name, bio, is_verified, avatar_url").ilike("display_name", `%${searchQuery}%`).limit(20),
      supabase.from("groups").select("id, name, description, is_public, created_at").ilike("name", `%${searchQuery}%`).eq("is_public", true).limit(20),
      user ? supabase.from("follows").select("following_id").eq("follower_id", user.id) : Promise.resolve({ data: [] }),
    ]);

    setFollowingSet(new Set(followsRes.data?.map((f: any) => f.following_id) || []));
    setResults({ posts: postsRes.data || [], users: usersRes.data || [], groups: groupsRes.data || [] });
    setLoading(false);
  };

  const toggleFollow = async (userId: string) => {
    if (!user) return;
    if (followingSet.has(userId)) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setFollowingSet((prev) => { const n = new Set(prev); n.delete(userId); return n; });
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      setFollowingSet((prev) => new Set(prev).add(userId));
      toast({ title: "Followed!" });
    }
  };

  const total = results.posts.length + results.users.length + results.groups.length;

  const clearSearch = () => {
    setQuery("");
    setResults({ posts: [], users: [], groups: [] });
    setSearched(false);
  };

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      {/* Search Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            className="pl-10 pr-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-11 text-[15px]"
          />
          {query && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <X className="h-3 w-3 text-primary-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Before search: Show trending */}
      {!searched && !loading && (
        <div>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="border-b border-border">
              <h2 className="font-display font-bold text-xl px-4 pt-4 pb-2">Recent</h2>
              {recentSearches.map((s, i) => (
                <button key={i} onClick={() => { setQuery(s); doSearch(s); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[15px]">{s}</span>
                </button>
              ))}
            </div>
          )}

          {/* Trending */}
          <div>
            <h2 className="font-display font-bold text-xl px-4 pt-4 pb-2">Trends for you</h2>
            {trendingTags.map((tag, i) => (
              <button key={tag.name} onClick={() => { setQuery(`#${tag.name}`); doSearch(`#${tag.name}`); }} className="w-full px-4 py-3 hover:bg-muted/30 transition-colors text-left">
                <p className="text-[13px] text-muted-foreground">Trending</p>
                <p className="font-bold text-[15px]">#{tag.name}</p>
                <p className="text-[13px] text-muted-foreground">{tag.post_count.toLocaleString()} posts</p>
              </button>
            ))}
            {trendingTags.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No trends available right now</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {(loading || searched) && (
        <div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
              {[
                { value: "all", label: "Top" },
                { value: "users", label: "People" },
                { value: "posts", label: "Posts" },
                { value: "groups", label: "Communities" },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value} className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[15px] font-semibold h-full text-muted-foreground data-[state=active]:text-foreground">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {loading ? (
              <div className="divide-y divide-border">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-3 p-4 animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-48 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <TabsContent value="all" className="mt-0">
                  {results.users.map((u) => (
                    <UserCard key={u.user_id} u={u} navigate={navigate} toggleFollow={toggleFollow} followingSet={followingSet} currentUserId={user?.id} />
                  ))}
                  {results.posts.map((p) => (
                    <div key={p.id} className="px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                      <p className="font-semibold text-[15px]">{p.title}</p>
                      <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{p.body || ""}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{p.likes_count} likes</span>
                        <span>{p.views_count} views</span>
                      </div>
                    </div>
                  ))}
                  {results.groups.map((g) => (
                    <button key={g.id} className="w-full flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors text-left" onClick={() => navigate("/dashboard/groups")}>
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-[15px]">{g.name}</p>
                        <p className="text-[13px] text-muted-foreground">{g.description || "Community"}</p>
                      </div>
                    </button>
                  ))}
                  {total === 0 && <p className="text-center text-muted-foreground py-16">No results for "{query}"</p>}
                </TabsContent>
                <TabsContent value="users" className="mt-0">
                  {results.users.map((u) => (
                    <UserCard key={u.user_id} u={u} navigate={navigate} toggleFollow={toggleFollow} followingSet={followingSet} currentUserId={user?.id} />
                  ))}
                  {results.users.length === 0 && <p className="text-center text-muted-foreground py-16">No people found</p>}
                </TabsContent>
                <TabsContent value="posts" className="mt-0">
                  {results.posts.map((p) => (
                    <div key={p.id} className="px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                      <p className="font-semibold text-[15px]">{p.title}</p>
                      <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{p.body || ""}</p>
                    </div>
                  ))}
                  {results.posts.length === 0 && <p className="text-center text-muted-foreground py-16">No posts found</p>}
                </TabsContent>
                <TabsContent value="groups" className="mt-0">
                  {results.groups.map((g) => (
                    <button key={g.id} className="w-full flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors text-left" onClick={() => navigate("/dashboard/groups")}>
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-[15px]">{g.name}</p>
                        <p className="text-[13px] text-muted-foreground">{g.description || "Community"}</p>
                      </div>
                    </button>
                  ))}
                  {results.groups.length === 0 && <p className="text-center text-muted-foreground py-16">No communities found</p>}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
};

const UserCard = ({ u, navigate, toggleFollow, followingSet, currentUserId }: any) => (
  <div
    className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
    onClick={() => navigate(`/dashboard/user/${u.user_id}`)}
  >
    <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
      {u.display_name?.[0]?.toUpperCase() || "U"}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1">
        <span className="font-bold text-[15px] hover:underline">{u.display_name || "User"}</span>
        {u.is_verified && <VerifiedBadge className="h-4 w-4" />}
      </div>
      {u.bio && <p className="text-[13px] text-muted-foreground truncate">{u.bio}</p>}
    </div>
    {currentUserId !== u.user_id && (
      <Button
        size="sm"
        variant={followingSet.has(u.user_id) ? "outline" : "default"}
        onClick={(e) => { e.stopPropagation(); toggleFollow(u.user_id); }}
        className={`rounded-full text-[13px] font-bold h-8 px-4 ${
          !followingSet.has(u.user_id) ? "bg-foreground text-background hover:bg-foreground/90" : ""
        }`}
      >
        {followingSet.has(u.user_id) ? "Following" : "Follow"}
      </Button>
    )}
  </div>
);

export default SearchPage;
