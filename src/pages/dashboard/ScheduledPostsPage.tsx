import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const ScheduledPostsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Scheduled Posts</h1>
      </div>
      <div className="text-center py-20">
        <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="font-display font-bold text-xl">No scheduled posts</h2>
        <p className="text-muted-foreground text-[15px] mt-1">Schedule posts to be published at a future time</p>
        <Button className="mt-4 rounded-full gradient-primary text-primary-foreground font-bold" onClick={() => navigate("/dashboard")}>Create Post</Button>
      </div>
    </div>
  );
};

export default ScheduledPostsPage;
