import { presenceLabel } from "@/hooks/usePresence";

interface Props {
  lastSeen: string | null | undefined;
  showLabel?: boolean;
  className?: string;
}

const PresenceIndicator = ({ lastSeen, showLabel = false, className = "" }: Props) => {
  const { online, label } = presenceLabel(lastSeen);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`relative inline-block h-2 w-2 rounded-full ${online ? "bg-success" : "bg-muted-foreground/40"}`}>
        {online && <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />}
      </span>
      {showLabel && <span className="text-xs text-muted-foreground">{online ? "Online" : label}</span>}
    </span>
  );
};

export default PresenceIndicator;
