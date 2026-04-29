import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { getSiteUrl, getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }
      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      isConfigured: isSupabaseConfigured,
      isLoading,
      session,
      signIn: async (email: string, password: string) => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      },
      sendMagicLink: async (email: string, nextPath = "/welcome") => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: getSiteUrl(nextPath),
          },
        });

        if (error) {
          throw error;
        }
      },
      requestPasswordReset: async (email: string) => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getSiteUrl("/reset-password"),
        });

        if (error) {
          throw error;
        }
      },
      updatePassword: async (password: string) => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          throw error;
        }
      },
      signOut: async () => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          return;
        }

        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      },
    };
  }, [isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
