import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  exam_year: number | null;
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        // Ensure profile exists (trigger normally handles this).
        const fallbackName =
          (user.user_metadata?.display_name as string | undefined) ??
          user.email?.split("@")[0] ??
          "Student";
        const { data: inserted } = await supabase
          .from("profiles")
          .insert({ id: user.id, display_name: fallbackName })
          .select("*")
          .maybeSingle();
        if (!cancelled) setProfile((inserted as Profile) ?? null);
      } else {
        setProfile(data as Profile);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function updateProfile(patch: Partial<Profile>) {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select("*")
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }

  return { profile, loading, updateProfile };
}
