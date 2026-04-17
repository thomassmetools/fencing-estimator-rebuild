import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://doyltymredlaenmwurbk.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Ry29oPC7th58UmeknU2pOA_KL5CEKuq";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const getSupabaseUrl = () => supabaseUrl;

let client: SupabaseClient | null = null;

export const getSiteUrl = (path = "") => {
  const configuredBaseUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, "");

  if (configuredBaseUrl) {
    return path ? `${configuredBaseUrl}${path.startsWith("/") ? path : `/${path}`}` : configuredBaseUrl;
  }

  if (typeof window !== "undefined") {
    return path
      ? `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`
      : window.location.origin;
  }

  return path || "";
};

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return client;
};
