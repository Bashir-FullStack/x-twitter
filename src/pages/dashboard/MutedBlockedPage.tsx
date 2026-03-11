import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, VolumeX, Ban } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const MutedBlockedPage = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="h-[53px] flex items-center gap-6 px-4">
          <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-xl font-bold">Muted & Blocked</h1>
        </div>
        <Tabs defaultValue="muted">
          <TabsList className="w-full bg-transparent h-[53px] p-0 gap-0 rounded-none border-b border-border">
            <TabsTrigger value="muted" className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full">Muted</TabsTrigger>
            <TabsTrigger value="blocked" className="flex-1 rounded-none border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold text-[15px] h-full">Blocked</TabsTrigger>
          </TabsList>
          <TabsContent value="muted" className="mt-0">
            <div className="text-center py-20"><VolumeX className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">No muted accounts</p></div>
          </TabsContent>
          <TabsContent value="blocked" className="mt-0">
            <div className="text-center py-20"><Ban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">No blocked accounts</p></div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MutedBlockedPage;
