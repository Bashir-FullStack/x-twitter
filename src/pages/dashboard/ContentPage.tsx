import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, Send } from "lucide-react";

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
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", body: "", category: "", tags: "", status: "draft" });

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
      const { error } = await supabase.from("posts").update(postData).eq("id", editingPost.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Post updated" });
    } else {
      const { error } = await supabase.from("posts").insert(postData);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
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

  const statusColor = (s: string) => s === "published" ? "default" : s === "draft" ? "secondary" : "outline";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Content</h1>
          <p className="text-muted-foreground">Manage your posts and articles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingPost(null); setForm({ title: "", body: "", category: "", tags: "", status: "draft" }); } }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> New Post</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingPost ? "Edit Post" : "Create Post"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Write your content..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} />
              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">
                  {editingPost ? "Update" : "Create"}
                </Button>
                {!editingPost && (
                  <Button variant="outline" onClick={() => { setForm({ ...form, status: "published" }); setTimeout(handleSave, 0); }}>
                    <Send className="mr-2 h-4 w-4" /> Publish
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : posts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No content yet. Create your first post!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="border-border/50">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{post.title}</h3>
                    <Badge variant={statusColor(post.status)}>{post.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{post.body || "No content"}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.views_count}</span>
                    <span>{post.category || "Uncategorized"}</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(post)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentPage;
