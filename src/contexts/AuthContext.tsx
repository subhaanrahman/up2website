import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/infrastructure/api-client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, code: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  mockLogin: () => void;
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
      const result = await callEdgeFunction<{
        success: boolean;
        email: string;
        token: string;
        user_id: string;
      }>('verify-otp', {
        method: 'POST',
        body: { phone, code },
      });

      // Use the hashed token to create a real Supabase session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: result.email,
        token: result.token,
        type: 'email',
      });

      if (verifyError) {
        return { error: verifyError };
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

  const mockLogin = () => {
    const mockUser = {
      id: "00000000-0000-0000-0000-000000000001",
      email: "dev@example.com",
      phone: "+1234567890",
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: { display_name: "Dev User" },
      aud: "authenticated",
    } as User;

    setUser(mockUser);
    setSession({ user: mockUser } as Session);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, sendOtp, verifyOtp, signOut, mockLogin }}>
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
