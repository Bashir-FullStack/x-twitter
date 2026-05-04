import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/** Updates the current user's last_seen every 30s and on visibility change. */
export const usePresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const ping = () => supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", user.id);
    ping();
    const interval = setInterval(ping, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [user]);
};

/** Returns "online" if last_seen within 90s, else last seen string. */
export const presenceLabel = (lastSeen: string | null | undefined): { online: boolean; label: string } => {
  if (!lastSeen) return { online: false, label: "Offline" };
  const seconds = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
  if (seconds < 90) return { online: true, label: "Online" };
  if (seconds < 60) return { online: false, label: `${seconds}s ago` };
  if (seconds < 3600) return { online: false, label: `${Math.floor(seconds / 60)}m ago` };
  if (seconds < 86400) return { online: false, label: `${Math.floor(seconds / 3600)}h ago` };
  if (seconds < 604800) return { online: false, label: `${Math.floor(seconds / 86400)}d ago` };
  return { online: false, label: new Date(lastSeen).toLocaleDateString() };
};
