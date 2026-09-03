import { supabase } from "@/integrations/supabase/client";

export type ReferralStatus = "pending" | "verified" | "rejected";

export type ReferralHistoryItem = {
  id: string;
  status: ReferralStatus;
  created_at: string;
  verified_at: string | null;
  referred_id: string;
  rejected_reason: string | null;
};

export type NotificationPreference = {
  daily_reminders: boolean;
  study_goal_reminders: boolean;
  streak_reminders: boolean;
  premium_updates: boolean;
};

export const defaultNotificationPreferences: NotificationPreference = {
  daily_reminders: true,
  study_goal_reminders: true,
  streak_reminders: true,
  premium_updates: true,
};

export async function getReferralData(userId: string) {
  const [{ data: code }, { data: referrals }] = await Promise.all([
    supabase.rpc("get_or_create_referral_code"),
    supabase
      .from("referrals")
      .select("id,status,created_at,verified_at,referred_id,rejected_reason")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  const history = (referrals ?? []) as ReferralHistoryItem[];
  return {
    code: code ?? "",
    link: code ? `${window.location.origin}/auth?ref=${encodeURIComponent(code)}` : "",
    history,
    verified: history.filter((item) => item.status === "verified").length,
  };
}

export async function getNotificationPreferences(userId: string) {
  const { data } = await supabase
    .from("notification_preferences")
    .select("daily_reminders,study_goal_reminders,streak_reminders,premium_updates")
    .eq("user_id", userId)
    .maybeSingle();
  return { ...defaultNotificationPreferences, ...(data ?? {}) } as NotificationPreference;
}

export async function saveNotificationPreference(
  userId: string,
  patch: Partial<NotificationPreference>,
) {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function listNotifications() {
  const { data } = await supabase
    .from("notifications")
    .select("id,title,body,scheduled_for,sent_at,created_at")
    .not("sent_at", "is", null)
    .order("scheduled_for", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function sendFeedback(
  userId: string,
  input: { category: "suggestion" | "bug" | "feedback"; rating: number; message: string },
) {
  const { error } = await supabase.from("feedback").insert({
    user_id: userId,
    category: input.category,
    rating: input.rating,
    message: input.message.trim(),
  });
  if (error) throw error;
}

export function getDeviceToken() {
  if (typeof window === "undefined") return "server";
  const key = "eklavya:device-token";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const token = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, token);
  return token;
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export async function shareText(title: string, text: string, url: string) {
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return true;
  }
  await copyText(url);
  return false;
}