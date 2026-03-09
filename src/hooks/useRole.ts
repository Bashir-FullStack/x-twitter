import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setRoles(data?.map((r) => r.role) || []);
      setLoading(false);
    });
  }, [user]);

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isModerator = roles.includes("moderator") || isAdmin;
  const isSuperAdmin = roles.includes("super_admin");

  return { roles, isAdmin, isModerator, isSuperAdmin, loading };
};
