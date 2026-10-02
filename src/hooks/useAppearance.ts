import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "./useAuth";

export type AppearanceMode = "dark" | "light" | "system";
const LOCAL_KEY = "eklavya:appearance.v1";

function systemMode(): "dark" | "light" {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolve(mode: AppearanceMode) {
  return mode === "system" ? systemMode() : mode;
}

export function useAppearance() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AppearanceMode>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem(LOCAL_KEY);
    return saved === "light" || saved === "system" ? saved : "dark";
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("appearance_mode").eq("id", user.id).maybeSingle().then(({ data }) => {
      const saved = (data as Pick<Profile, "appearance_mode"> | null)?.appearance_mode;
      if (saved === "light" || saved === "dark" || saved === "system") {
        setMode(saved);
        window.localStorage.setItem(LOCAL_KEY, saved);
      }
    });
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolve(mode) === "dark");
    document.documentElement.style.colorScheme = resolve(mode);
  }, [mode]);

  async function changeMode(next: AppearanceMode) {
    setMode(next);
    window.localStorage.setItem(LOCAL_KEY, next);
    if (user) await supabase.from("profiles").update({ appearance_mode: next }).eq("id", user.id);
  }

  return { mode, changeMode };
}