import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  className?: string;
  onClick?: () => void;
}

const UserAvatar = ({ avatarUrl, displayName, className, onClick }: UserAvatarProps) => {
  const url = getAvatarUrl(avatarUrl);
  const initial = displayName?.[0]?.toUpperCase() || "U";

  return (
    <Avatar className={cn("cursor-pointer hover:opacity-80 transition-opacity", className)} onClick={onClick}>
      {url && <AvatarImage src={url} alt={displayName || "User"} />}
      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
