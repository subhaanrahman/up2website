import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from '@/infrastructure/supabase';
import { callEdgeFunction } from "@/infrastructure/api-client";
import { toE164 } from "@/utils/phone";

interface ForgotPasswordCheckResult {
  hasVerifiedEmail: boolean;
  maskedEmail?: string;
  email?: string;
  resetToken?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  checkPhone: (phone: string) => Promise<{ exists: boolean; error: Error | null }>;
  sendOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, code: string) => Promise<{ error: Error | null; loggedIn?: boolean }>;
  register: (data: RegisterInput) => Promise<{ error: Error | null }>;
  login: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  devLogin: (userId: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  forgotPasswordCheck: (phone: string, code: string) => Promise<{ result: ForgotPasswordCheckResult | null; error: Error | null }>;
  forgotPasswordReset: (resetToken: string, newPassword: string) => Promise<{ error: Error | null }>;
}

export interface RegisterInput {
  phone: string;
  displayName: string;
  username: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Dedup guard: once onAuthStateChange fires, skip the getSession fallback
  const authStateReceived = useRef(false);

  useEffect(() => {
    authStateReceived.current = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        authStateReceived.current = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Cold boot / refresh recovery — only if onAuthStateChange hasn't fired yet
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authStateReceived.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkPhone = async (phone: string) => {
    try {
      const normalized = toE164(phone);
      const result = await callEdgeFunction<{ exists: boolean }>('check-phone', {
        method: 'POST',
        body: { phone: normalized },
      });
      return { exists: result.exists, error: null };
    } catch (err) {
      return { exists: false, error: err as Error };
    }
  };

  const sendOtp = async (phone: string) => {
    try {
      const normalized = toE164(phone);
      await callEdgeFunction('send-otp', {
        method: 'POST',
        body: { phone: normalized },
      });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const verifyOtp = async (phone: string, code: string) => {
    try {
      const normalized = toE164(phone);
      const result = await callEdgeFunction<{
        verified: boolean;
        access_token?: string;
        refresh_token?: string;
      }>('verify-otp', {
        method: 'POST',
        body: { phone: normalized, code },
      });
      if (result.access_token && result.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });
        if (sessionError) return { error: sessionError };
        return { error: null, loggedIn: true };
      }
      return { error: null, loggedIn: false };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const register = async (data: RegisterInput) => {
    try {
      const normalized = toE164(data.phone);
      const result = await callEdgeFunction<{
        success: boolean;
        access_token: string;
        refresh_token: string;
        user_id: string;
      }>('register', {
        method: 'POST',
        body: { ...data, phone: normalized },
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
      const normalized = toE164(phone);
      const result = await callEdgeFunction<{
        success: boolean;
        access_token: string;
        refresh_token: string;
        user_id: string;
      }>('login', {
        method: 'POST',
        body: { phone: normalized, password },
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

  const resetPasswordForEmail = async (email: string, redirectTo?: string) => {
    try {
      const to = redirectTo ?? `${window.location.origin}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: to });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const forgotPasswordCheck = async (phone: string, code: string) => {
    try {
      const normalized = toE164(phone);
      const result = await callEdgeFunction<{
        hasVerifiedEmail: boolean;
        maskedEmail?: string;
        email?: string;
        resetToken?: string;
      }>('forgot-password-check', {
        method: 'POST',
        body: { phone: normalized, code },
      });
      return {
        result: {
          hasVerifiedEmail: result.hasVerifiedEmail,
          maskedEmail: result.maskedEmail,
          email: result.email,
          resetToken: result.resetToken,
        },
        error: null,
      };
    } catch (err) {
      return { result: null, error: err as Error };
    }
  };

  const forgotPasswordReset = async (resetToken: string, newPassword: string) => {
    try {
      await callEdgeFunction('forgot-password-reset', {
        method: 'POST',
        body: { resetToken, newPassword },
      });
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
      resetPasswordForEmail, forgotPasswordCheck, forgotPasswordReset,
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
