import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  sendMagicLink: (email: string, nextPath?: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
