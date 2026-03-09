import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="animate-fade-in space-y-6">
    <h1 className="font-display text-2xl font-bold">{title}</h1>
    <Card className="border-border/50">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Construction className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold">Coming Soon</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          This feature is under development and will be available soon.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default PlaceholderPage;
