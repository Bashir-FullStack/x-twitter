import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, User, Users as UsersIcon, Clock, UserPlus } from "lucide-react";
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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const doSearch = async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true);

    if (!recentSearches.includes(searchQuery)) {
      setRecentSearches((prev) => [searchQuery, ...prev.slice(0, 9)]);
    }

    const [postsRes, usersRes, groupsRes, followsRes] = await Promise.all([
      supabase.from("posts").select("id, title, body, status, category, created_at, user_id").ilike("title", `%${searchQuery}%`).eq("status", "published").limit(20),
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

  const UserCard = ({ u }: { u: any }) => (
    <div
      className="flex items-center gap-3 p-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/dashboard/user/${u.user_id}`)}
    >
      <div className="h-11 w-11 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
        {u.display_name?.[0]?.toUpperCase() || "U"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-sm hover:underline">{u.display_name || "User"}</span>
          {u.is_verified && <VerifiedBadge className="h-4 w-4" />}
        </div>
        {u.bio && <p className="text-xs text-muted-foreground truncate max-w-md">{u.bio}</p>}
      </div>
      {user?.id !== u.user_id && (
        <Button
          size="sm"
          variant={followingSet.has(u.user_id) ? "outline" : "default"}
          onClick={(e) => { e.stopPropagation(); toggleFollow(u.user_id); }}
          className={`rounded-full text-xs h-8 px-4 ${!followingSet.has(u.user_id) ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
        >
          {followingSet.has(u.user_id) ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Sticky search header */}
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-md border-b border-border -mx-4 lg:-mx-6 px-4 lg:px-6 py-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              className="pl-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <Button onClick={() => doSearch()} className="rounded-full gradient-primary text-primary-foreground">Search</Button>
        </div>
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && !loading && total === 0 && (
        <div className="p-4 border-b border-border">
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2"><Clock className="h-3 w-3" /> Recent</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s, i) => (
              <button key={i} onClick={() => { setQuery(s); doSearch(s); }} className="text-sm text-primary hover:underline">{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {(loading || total > 0) && (
        <div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full bg-transparent h-11 p-0 gap-0 border-b border-border rounded-none">
              <TabsTrigger value="all" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-semibold">
                All ({total})
              </TabsTrigger>
              <TabsTrigger value="users" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-semibold">
                People ({results.users.length})
              </TabsTrigger>
              <TabsTrigger value="posts" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-semibold">
                Posts ({results.posts.length})
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-semibold">
                Groups ({results.groups.length})
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Searching...</div>
            ) : (
              <>
                <TabsContent value="all" className="mt-0">
                  {results.users.map((u) => <UserCard key={u.user_id} u={u} />)}
                  {results.posts.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.category || "Post"} · {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {results.groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 p-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate("/dashboard/groups")}>
                      <UsersIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.description || "No description"}</p>
                      </div>
                    </div>
                  ))}
                  {total === 0 && <p className="text-center text-muted-foreground py-12">No results found</p>}
                </TabsContent>
                <TabsContent value="users" className="mt-0">
                  {results.users.map((u) => <UserCard key={u.user_id} u={u} />)}
                  {results.users.length === 0 && <p className="text-center text-muted-foreground py-12">No people found</p>}
                </TabsContent>
                <TabsContent value="posts" className="mt-0">
                  {results.posts.map((p) => (
                    <div key={p.id} className="p-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                      <p className="font-semibold text-sm">{p.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.body || "No content"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {results.posts.length === 0 && <p className="text-center text-muted-foreground py-12">No posts found</p>}
                </TabsContent>
                <TabsContent value="groups" className="mt-0">
                  {results.groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 p-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate("/dashboard/groups")}>
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-accent/10 flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.description || "No description"} · {g.is_public ? "Public" : "Private"}</p>
                      </div>
                    </div>
                  ))}
                  {results.groups.length === 0 && <p className="text-center text-muted-foreground py-12">No groups found</p>}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
