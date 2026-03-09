import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, User, Users as UsersIcon, Clock } from "lucide-react";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [results, setResults] = useState<{ posts: any[]; users: any[]; groups: any[] }>({ posts: [], users: [], groups: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const doSearch = async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true);

    if (!recentSearches.includes(searchQuery)) {
      setRecentSearches((prev) => [searchQuery, ...prev.slice(0, 9)]);
    }

    const [postsRes, usersRes, groupsRes] = await Promise.all([
      supabase.from("posts").select("id, title, body, status, category, created_at").ilike("title", `%${searchQuery}%`).eq("status", "published").limit(20),
      supabase.from("profiles").select("user_id, display_name, bio, is_verified, avatar_url").ilike("display_name", `%${searchQuery}%`).limit(20),
      supabase.from("groups").select("id, name, description, is_public, created_at").ilike("name", `%${searchQuery}%`).eq("is_public", true).limit(20),
    ]);

    setResults({ posts: postsRes.data || [], users: usersRes.data || [], groups: groupsRes.data || [] });
    setLoading(false);
  };

  const total = results.posts.length + results.users.length + results.groups.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Search</h1>
        <p className="text-muted-foreground">Find content, people, and groups</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} className="pl-10" />
        </div>
        <Button onClick={() => doSearch()} className="gradient-primary text-primary-foreground">Search</Button>
      </div>

      {recentSearches.length > 0 && !loading && total === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s, i) => (
              <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => { setQuery(s); doSearch(s); }}>{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {(loading || total > 0) && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({total})</TabsTrigger>
            <TabsTrigger value="posts">Posts ({results.posts.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({results.users.length})</TabsTrigger>
            <TabsTrigger value="groups">Groups ({results.groups.length})</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Searching...</div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-3">
                {results.users.map((u) => (
                  <Card key={u.user_id} className="border-border/50">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm">{u.display_name || "User"}</span>
                          {u.is_verified && <span className="text-primary" title="Verified">✓</span>}
                        </div>
                        {u.bio && <p className="text-xs text-muted-foreground truncate max-w-md">{u.bio}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {results.posts.map((p) => (
                  <Card key={p.id} className="border-border/50">
                    <CardContent className="flex items-center gap-3 p-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.category || "Uncategorized"} · {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {results.groups.map((g) => (
                  <Card key={g.id} className="border-border/50">
                    <CardContent className="flex items-center gap-3 p-4">
                      <UsersIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.description || "No description"}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {total === 0 && <p className="text-center text-muted-foreground py-8">No results found</p>}
              </TabsContent>
              <TabsContent value="posts" className="space-y-3">
                {results.posts.map((p) => (
                  <Card key={p.id} className="border-border/50"><CardContent className="p-4"><p className="font-medium">{p.title}</p><p className="text-sm text-muted-foreground mt-1">{p.body?.slice(0, 100) || "No content"}</p></CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="users" className="space-y-3">
                {results.users.map((u) => (
                  <Card key={u.user_id} className="border-border/50"><CardContent className="flex items-center gap-3 p-4"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div><div><span className="font-medium text-sm">{u.display_name}</span>{u.is_verified && <span className="ml-1 text-primary">✓</span>}</div></CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="groups" className="space-y-3">
                {results.groups.map((g) => (
                  <Card key={g.id} className="border-border/50"><CardContent className="flex items-center gap-3 p-4"><UsersIcon className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">{g.name}</p><p className="text-sm text-muted-foreground">{g.description}</p></div></CardContent></Card>
                ))}
              </TabsContent>
            </>
          )}
        </Tabs>
      )}
    </div>
  );
};

export default SearchPage;
