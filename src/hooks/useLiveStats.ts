import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type LiveStats = {
  attempts: number;
  correct: number;
  bookmarks: number;
  mistakes: number;
  mockTests: number;
  currentStreak: number;
  bestStreak: number;
  practiceMinutes: number;
  accuracy: number;
};

const empty: LiveStats = {
  attempts: 0, correct: 0, bookmarks: 0, mistakes: 0,
  mockTests: 0, currentStreak: 0, bestStreak: 0,
  practiceMinutes: 0, accuracy: 0,
};

function computeStreaks(dates: string[]): { current: number; best: number } {
  if (!dates.length) return { current: 0, best: 0 };
  const days = Array.from(new Set(dates.map((d) => d.slice(0, 10)))).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00Z").getTime();
    const cur = new Date(days[i] + "T00:00:00Z").getTime();
    const diff = (cur - prev) / 86400000;
    if (diff === 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  // Current streak counts backwards from today.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let current = 0;
  const set = new Set(days);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) current++;
    else if (i > 0) break;
  }
  return { current, best };
}

export function useLiveStats(user: User | null) {
  const [stats, setStats] = useState<LiveStats>(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setStats(empty);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const uid = user.id;
      const [a, ac, b, m, mt, ps, dates] = await Promise.all([
        supabase.from("attempts").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("attempts").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("is_correct", true),
        supabase.from("bookmarks").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("mistakes").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("mock_tests").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("practice_sessions").select("total_time_seconds").eq("user_id", uid),
        supabase.from("attempts").select("created_at").eq("user_id", uid).order("created_at", { ascending: true }).limit(2000),
      ]);
      if (cancelled) return;
      const attempts = a.count ?? 0;
      const correct = ac.count ?? 0;
      const streaks = computeStreaks((dates.data ?? []).map((r) => r.created_at));
      const practiceSeconds = (ps.data ?? []).reduce((sum, r) => sum + (r.total_time_seconds ?? 0), 0);
      setStats({
        attempts,
        correct,
        bookmarks: b.count ?? 0,
        mistakes: m.count ?? 0,
        mockTests: mt.count ?? 0,
        currentStreak: streaks.current,
        bestStreak: streaks.best,
        practiceMinutes: Math.round(practiceSeconds / 60),
        accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { stats, loading };
}

export type MockTestRow = {
  id: string;
  subject_id: string | null;
  test_name: string;
  score: number;
  total_questions: number;
  accuracy: number;
  percentage: number;
  time_taken_seconds: number;
  taken_at: string;
};

export function useMockTests(user: User | null) {
  const [rows, setRows] = useState<MockTestRow[]>([]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("mock_tests")
        .select("*")
        .eq("user_id", user.id)
        .order("taken_at", { ascending: false })
        .limit(20);
      if (!cancelled) setRows((data as MockTestRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [user]);
  return rows;
}
