import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ChevronDown, ChevronRight, MessageCircle, Shield, Settings, Users, FileText, Heart, HelpCircle, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const faqs = [
  { category: "Account", icon: Settings, items: [
    { q: "How do I change my password?", a: "Go to Settings → Security → Change Password. Enter your new password and confirm." },
    { q: "How do I delete my account?", a: "Go to Settings → Your Account → Deactivate your account. This action is permanent." },
    { q: "How do I change my display name?", a: "Go to your Profile page and click 'Edit profile'. You can update your name there." },
    { q: "How do I change my profile picture?", a: "Go to your Profile page and hover over your avatar. Click the camera icon to upload a new photo." },
  ]},
  { category: "Posts & Content", icon: FileText, items: [
    { q: "How do I create a post?", a: "From your feed, type in the 'What is happening?!' box and click Post. You can add images, emojis, and hashtags." },
    { q: "How do I delete a post?", a: "Click the three dots (⋯) on your post and select 'Delete post'." },
    { q: "How do hashtags work?", a: "Include #hashtags in your posts. They'll appear in trending topics if popular enough." },
    { q: "Can I edit my posts?", a: "Yes! Click the three dots on your post and select 'Edit post'." },
    { q: "What's the character limit?", a: "Posts have a 500 character limit. A progress ring shows how close you are to the limit." },
  ]},
  { category: "Following & Followers", icon: Users, items: [
    { q: "How do I follow someone?", a: "Visit their profile and click the 'Follow' button, or follow from search results and suggestions." },
    { q: "How do I see who follows me?", a: "Go to your Profile and click on your follower count to see the full list." },
    { q: "Can I remove a follower?", a: "Currently, you can block users which will also remove them as followers." },
  ]},
  { category: "Messages", icon: MessageCircle, items: [
    { q: "How do I send a message?", a: "Go to Messages, search for a user, and start typing. You can also message from someone's profile." },
    { q: "Can I delete messages?", a: "Yes, hover over a message and click the delete option from the menu." },
    { q: "Are messages private?", a: "Yes, direct messages are private between you and the recipient." },
  ]},
  { category: "Privacy & Safety", icon: Shield, items: [
    { q: "How do I report a user?", a: "Visit their profile, click the three dots, and select 'Report user'." },
    { q: "How do I block someone?", a: "Visit their profile, click the three dots, and select 'Block user'." },
    { q: "How do I report a post?", a: "Click the three dots on any post and select 'Report post'." },
  ]},
  { category: "Verification", icon: Heart, items: [
    { q: "What does the blue checkmark mean?", a: "The blue checkmark (✓) indicates a verified account. Admins are automatically verified." },
    { q: "How do I get verified?", a: "Verification is granted by platform administrators. Continue contributing quality content to be considered." },
  ]},
];

const HelpPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const filteredFaqs = searchQuery
    ? faqs.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : faqs;

  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-6 px-4 h-[53px]">
          <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-xl font-bold">Help Center</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search for help..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-10" />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="p-4 border-b border-border bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Mail className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <p className="font-bold text-[15px]">Need more help?</p>
            <p className="text-[13px] text-muted-foreground">Contact support through the platform</p>
          </div>
          <Button size="sm" className="rounded-full gradient-primary text-primary-foreground font-bold">Contact</Button>
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="divide-y divide-border">
        {filteredFaqs.map(cat => (
          <div key={cat.category}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <cat.icon className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[15px]">{cat.category}</p>
                <p className="text-[13px] text-muted-foreground">{cat.items.length} articles</p>
              </div>
              {expandedCategory === cat.category ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </button>
            {(expandedCategory === cat.category || searchQuery) && (
              <div className="pb-2">
                {cat.items.map(item => (
                  <div key={item.q}>
                    <button
                      onClick={() => setExpandedQ(expandedQ === item.q ? null : item.q)}
                      className="w-full text-left px-4 pl-16 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[15px] font-medium">{item.q}</p>
                        {expandedQ === item.q ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </div>
                    </button>
                    {expandedQ === item.q && (
                      <div className="px-4 pl-16 pb-3">
                        <p className="text-[14px] text-muted-foreground leading-relaxed bg-muted/30 rounded-xl p-3">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredFaqs.length === 0 && (
        <div className="text-center py-16">
          <HelpCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-display font-bold text-xl">No results found</p>
          <p className="text-sm text-muted-foreground mt-1">Try different search terms</p>
        </div>
      )}
    </div>
  );
};

export default HelpPage;
