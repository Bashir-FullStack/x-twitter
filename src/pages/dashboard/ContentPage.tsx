import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, Eye, FileText, Send, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Post {
  id: string;
  title: string;
  body: string | null;
  status: string;
  category: string | null;
  tags: string[];
  likes_count: number;
  views_count: number;
  created_at: string;
}

const ContentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", body: "", category: "", tags: "", status: "draft" });
  const [filter, setFilter] = useState("all");

  const fetchPosts = async () => {
    if (!user) return;
    const { data } = await supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPosts((data as Post[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    const postData = {
      title: form.title,
      body: form.body || null,
      category: form.category || null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
      status: form.status,
      user_id: user.id,
    };
    if (editingPost) {
      await supabase.from("posts").update(postData).eq("id", editingPost.id);
      toast({ title: "Post updated" });
    } else {
      await supabase.from("posts").insert(postData);
      toast({ title: "Post created" });
    }
    setDialogOpen(false);
    setEditingPost(null);
    setForm({ title: "", body: "", category: "", tags: "", status: "draft" });
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    toast({ title: "Post deleted" });
    fetchPosts();
  };

  const openEdit = (post: Post) => {
    setEditingPost(post);
    setForm({ title: post.title, body: post.body || "", category: post.category || "", tags: post.tags?.join(", ") || "", status: post.status });
    setDialogOpen(true);
  };

  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-[53px]">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold">My Posts</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingPost(null); setForm({ title: "", body: "", category: "", tags: "", status: "draft" }); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full gradient-primary text-primary-foreground font-bold">
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle className="font-display">{editingPost ? "Edit Post" : "Create Post"}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11" />
                <Textarea placeholder="Write your content..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} className="resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <Input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSave} className="w-full rounded-full gradient-primary text-primary-foreground font-bold h-11">
                  {editingPost ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
            {[
              { value: "all", label: `All (${posts.length})` },
              { value: "published", label: `Published` },
              { value: "draft", label: `Drafts` },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full text-muted-foreground data-[state=active]:text-foreground">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[1,2,3].map(i => (
            <div key={i} className="p-4 animate-pulse">
              <div className="h-4 w-48 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 px-8">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl mb-1">No posts yet</h2>
          <p className="text-[15px] text-muted-foreground">Create your first post to get started.</p>
        </div>
      ) : (
        <div>
          {filtered.map((post) => (
            <div key={post.id} className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[15px] truncate">{post.title}</p>
                  <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {post.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[13px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.views_count}</span>
                  <span>❤️ {post.likes_count}</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(post)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(post.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentPage;
