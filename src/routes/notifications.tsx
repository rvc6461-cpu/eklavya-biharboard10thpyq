import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Check, Flame, Goal, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getNotificationPreferences, listNotifications, saveNotificationPreference, type NotificationPreference } from "@/lib/phase4b";

export const Route = createFileRoute("/notifications")({ ssr: false, head: () => ({ meta: [
  { title: "Notifications · Eklavya" }, { name: "description", content: "Stay on top of your Eklavya study reminders and updates." },
  { property: "og:title", content: "Notifications · Eklavya" }, { property: "og:description", content: "Study reminders and Eklavya updates." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: NotificationsPage });

const preferenceItems: Array<{ key: keyof NotificationPreference; label: string; detail: string; icon: typeof Bell }> = [
  { key: "daily_reminders", label: "Daily Reminder", detail: "A gentle nudge to keep learning", icon: Bell },
  { key: "study_goal_reminders", label: "Study Goal Reminder", detail: "Stay on track with today's goal", icon: Goal },
  { key: "streak_reminders", label: "Streak Reminder", detail: "Protect your practice streak", icon: Flame },
  { key: "premium_updates", label: "Premium Updates", detail: "New notes and formula sheets", icon: Sparkles },
];

function NotificationsPage() {
  const navigate = useNavigate(); const { user, loading } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null); const [items, setItems] = useState<Array<{ id: string; title: string; body: string; created_at: string }>>([]); const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", search: { next: "/notifications" } }); }, [loading, user, navigate]);
  useEffect(() => { if (!user) return; Promise.all([getNotificationPreferences(user.id), listNotifications()]).then(([p, n]) => { setPrefs(p); setItems(n); }); }, [user]);
  if (loading || !user || !prefs) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  async function toggle(key: keyof NotificationPreference) { if (!prefs || !user) return; const next = !prefs[key]; setPrefs({ ...prefs, [key]: next }); setSaving(key); try { await saveNotificationPreference(user.id, { [key]: next }); } finally { setSaving(null); } }
  return <div className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-md"><header className="flex items-center justify-between px-5 pt-6 pb-4"><Link to="/" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link><h1 className="font-display text-base font-bold">Notifications</h1><div className="w-10" /></header><main className="space-y-6 px-5"><section><p className="mb-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Preferences</p><div className="space-y-2">{preferenceItems.map(({ key, label, detail, icon: Icon }) => <div key={key} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{label}</p><p className="text-[11px] text-muted-foreground">{detail}</p></div><button type="button" aria-label={`Toggle ${label}`} disabled={saving === key} onClick={() => toggle(key)} className={`relative h-6 w-11 rounded-full transition ${prefs[key] ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-background transition ${prefs[key] ? "left-6" : "left-1"}`} />{prefs[key] && <Check className="sr-only" />}</button></div>)}</div></section><section><p className="mb-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Updates</p>{items.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center"><Bell className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">You're all caught up</p><p className="mt-1 text-xs text-muted-foreground">New study updates will appear here.</p></div> : <div className="space-y-2">{items.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-4"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p><p className="mt-2 text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p></div>)}</div>}</section></main></div></div>;
}