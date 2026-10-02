import { supabase } from "@/integrations/supabase/client";

export type AppSetting = { key: string; exam_date: string | null };
export type MotivationQuote = {
  id: string;
  quote_text: string;
  quote_date: string | null;
  is_active: boolean;
};

export async function fetchExamDate() {
  const { data } = await supabase.from("app_settings").select("key,exam_date").eq("key", "exam").maybeSingle();
  return (data as AppSetting | null)?.exam_date ?? null;
}

export async function fetchTodayMotivation() {
  const today = new Date().toISOString().slice(0, 10);
  const dated = await supabase
    .from("motivation_quotes")
    .select("id,quote_text,quote_date,is_active")
    .eq("quote_date", today)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (dated.data) return dated.data as MotivationQuote;
  const active = await supabase
    .from("motivation_quotes")
    .select("id,quote_text,quote_date,is_active")
    .eq("is_active", true);
  const rows = (active.data ?? []) as MotivationQuote[];
  return rows.length ? rows[Math.floor(Math.random() * rows.length)] : null;
}

export function daysUntil(date: string | null) {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}