// Wires Supabase auth state into the cloud sync layer. Runs the one-shot
// merge on sign-in so any offline progress is uploaded and cloud rows are
// pulled into localStorage.
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setCloudUser, mergeOnLogin } from "@/lib/pyq/cloud";

const LOCAL_KEY = "eklavya:pyq:v1";

function readLocal() {
  if (typeof window === "undefined") return { attempts: {}, attemptLog: [], bookmarks: [], mistakes: [], mastered: [] };
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return { attempts: {}, attemptLog: [], bookmarks: [], mistakes: [], mastered: [] };
    return JSON.parse(raw);
  } catch {
    return { attempts: {}, attemptLog: [], bookmarks: [], mistakes: [], mastered: [] };
  }
}

function writeLocal(state: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("eklavya:pyq:update"));
}

let mergedForUser: string | null = null;

async function runMerge(userId: string) {
  if (mergedForUser === userId) return;
  mergedForUser = userId;
  setCloudUser(userId);
  await mergeOnLogin(userId, readLocal(), (next) => writeLocal(next));
}

export function useCloudSync() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setCloudUser(uid);
      if (uid) void runMerge(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setCloudUser(uid);
      if (event === "SIGNED_IN" && uid) void runMerge(uid);
      if (event === "SIGNED_OUT") mergedForUser = null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);
}
