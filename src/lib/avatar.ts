import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const getAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("http")) return avatarUrl;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
};

export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  
  // Update profile with avatar path
  await supabase.from("profiles").update({ avatar_url: path }).eq("user_id", userId);
  
  return path;
};
