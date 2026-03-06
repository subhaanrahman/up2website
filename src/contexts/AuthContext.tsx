import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/infrastructure/api-client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  checkPhone: (phone: string) => Promise<{ exists: boolean; error: Error | null }>;
  sendOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, code: string) => Promise<{ error: Error | null }>;
  register: (data: RegisterInput) => Promise<{ error: Error | null }>;
  login: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  devLogin: (userId: string) => Promise<{ error: Error | null }>;
}

export interface RegisterInput {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkPhone = async (phone: string) => {
    try {
      const result = await callEdgeFunction<{ exists: boolean }>('check-phone', {
        method: 'POST',
        body: { phone },
      });
      return { exists: result.exists, error: null };
    } catch (err) {
      return { exists: false, error: err as Error };
    }
  };

  const sendOtp = async (phone: string) => {
    try {
      await callEdgeFunction('send-otp', {
        method: 'POST',
        body: { phone },
      });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const verifyOtp = async (phone: string, code: string) => {
    try {
      await callEdgeFunction<{ verified: boolean }>('verify-otp', {
        method: 'POST',
        body: { phone, code },
      });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const register = async (data: RegisterInput) => {
    try {
      const result = await callEdgeFunction<{
        success: boolean;
        access_token: string;
        refresh_token: string;
        user_id: string;
      }>('register', {
        method: 'POST',
        body: data,
      });

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionError) {
        return { error: sessionError };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const login = async (phone: string, password: string) => {
    try {
      const result = await callEdgeFunction<{
        success: boolean;
        access_token: string;
        refresh_token: string;
        user_id: string;
      }>('login', {
        method: 'POST',
        body: { phone, password },
      });

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionError) {
        return { error: sessionError };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const devLogin = async (userId: string) => {
    try {
      const result = await callEdgeFunction<{
        success: boolean;
        access_token: string;
        refresh_token: string;
        user_id: string;
      }>('dev-login', {
        method: 'POST',
        body: { user_id: userId },
      });

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionError) {
        return { error: sessionError };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      checkPhone, sendOtp, verifyOtp, register, login,
      signOut, devLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
