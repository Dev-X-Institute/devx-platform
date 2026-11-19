import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createBackend, type EducationRole } from "@devx/core";

export interface EducationMembership {
  id: string;
  school_id: string;
  role: EducationRole;
  school_name: string;
  school_slug: string;
}

export interface EducationAuth {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  memberships: EducationMembership[];
  activeMembership: EducationMembership | null;
  error: string;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName: string): Promise<void>;
  signOut(): Promise<void>;
  selectMembership(id: string): void;
}

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
const configured = Boolean(url && anonKey);
const backend: SupabaseClient | null = configured
  ? createBackend({ url, anonKey })
  : null;

const AuthContext = createContext<EducationAuth | null>(null);

function safeAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(message)) return "Check your email and confirm your account before signing in.";
  if (/user already registered/i.test(message)) return "An account already exists for this email. Sign in instead.";
  return "We couldn't complete that request. Check your details and try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<EducationMembership[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!backend) return;
    let alive = true;
    const loadMemberships = async (userId: string) => {
      const { data, error: queryError } = await backend
        .from("school_memberships")
        .select("id, school_id, role, schools(name, slug)")
        .eq("user_id", userId)
        .eq("status", "active");
      if (!alive) return;
      if (queryError) {
        setError("Your school access could not be loaded. Please try again.");
        setMemberships([]);
        return;
      }
      const rows = (data ?? []) as unknown as Array<{
        id: string;
        school_id: string;
        role: EducationRole;
        schools: { name: string; slug: string } | null;
      }>;
      const active = rows.filter((row) => row.schools).map((row) => ({
        id: row.id,
        school_id: row.school_id,
        role: row.role,
        school_name: row.schools!.name,
        school_slug: row.schools!.slug,
      }));
      setMemberships(active);
      setActiveId((current) => active.some((item) => item.id === current)
        ? current
        : active[0]?.id ?? "");
    };

    const applySession = async (next: Session | null) => {
      setLoading(true);
      setSession(next);
      setError("");
      if (next) await loadMemberships(next.user.id);
      else {
        setMemberships([]);
        setActiveId("");
      }
      if (alive) setLoading(false);
    };

    void backend.auth.getSession().then(async ({ data, error: sessionError }) => {
      await applySession(data.session);
      if (sessionError && alive) setError("Your sign-in session could not be checked. Please sign in again.");
    });
    const { data: listener } = backend.auth.onAuthStateChange((_event, next) => {
      // Defer the profile query until the auth callback has returned.
      queueMicrotask(() => void applySession(next));
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<EducationAuth>(() => ({
    configured,
    loading,
    session,
    memberships,
    activeMembership: memberships.find((item) => item.id === activeId) ?? null,
    error,
    async signIn(email, password) {
      if (!backend) return;
      setError("");
      const { error: authError } = await backend.auth.signInWithPassword({ email, password });
      if (authError) setError(safeAuthError(authError.message));
    },
    async signUp(email, password, displayName) {
      if (!backend) return;
      setError("");
      const { data, error: authError } = await backend.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (authError) {
        setError(safeAuthError(authError.message));
      } else if (!data.session) {
        setError("Account created. Check your email to confirm it, then sign in.");
      }
    },
    async signOut() {
      if (!backend) return;
      const { error: authError } = await backend.auth.signOut();
      if (authError) setError("We couldn't sign you out. Please try again.");
    },
    selectMembership(id) {
      if (memberships.some((item) => item.id === id)) setActiveId(id);
    },
  }), [loading, session, memberships, activeId, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useEducationAuth(): EducationAuth {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useEducationAuth must be used inside AuthProvider");
  return value;
}
