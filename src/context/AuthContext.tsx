import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase } from '@/lib/supabaseClient';
import { USE_SUPABASE } from '@/lib/config';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  usingSupabase: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_KEY = 'iimas_demo_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function init() {
      if (USE_SUPABASE) {
        const sb = getSupabase();
        const { data } = await sb!.auth.getSession();
        if (active && data.session?.user) {
          setUser({ id: data.session.user.id, email: data.session.user.email ?? '' });
        }
        sb!.auth.onAuthStateChange((_e, session) => {
          setUser(
            session?.user
              ? { id: session.user.id, email: session.user.email ?? '' }
              : null,
          );
        });
      } else {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) setUser(JSON.parse(raw));
      }
      if (active) setLoading(false);
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const demoSignIn = (email: string): { error?: string } => {
      const u = { id: 'demo-' + email, email };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setUser(u);
      return {};
    };

    return {
      user,
      loading,
      usingSupabase: USE_SUPABASE,
      async signIn(email, password) {
        if (USE_SUPABASE) {
          const { error } = await getSupabase()!.auth.signInWithPassword({
            email,
            password,
          });
          return error ? { error: error.message } : {};
        }
        if (!email || password.length < 4)
          return { error: 'Enter an email and a password of at least 4 characters.' };
        return demoSignIn(email);
      },
      async signUp(email, password) {
        if (USE_SUPABASE) {
          const { error } = await getSupabase()!.auth.signUp({ email, password });
          return error ? { error: error.message } : {};
        }
        if (!email || password.length < 4)
          return { error: 'Enter an email and a password of at least 4 characters.' };
        return demoSignIn(email);
      },
      async resetPassword(email) {
        if (USE_SUPABASE) {
          const { error } = await getSupabase()!.auth.resetPasswordForEmail(email);
          return error ? { error: error.message } : {};
        }
        return {};
      },
      async signOut() {
        if (USE_SUPABASE) await getSupabase()!.auth.signOut();
        localStorage.removeItem(DEMO_KEY);
        setUser(null);
      },
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
