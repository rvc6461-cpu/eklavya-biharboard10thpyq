import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookmarkCheck,
  Crown,
  FlaskConical,
  LogOut,
  Mail,
  NotebookPen,
  Pencil,
  Target,
  TrendingUp,
  CalendarDays,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/useAuth";

export const Route = createFileRoute("/profile")({
  ssr: false,
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile – Eklavya" },
      { name: "description", content: "Your Eklavya profile, progress and study stats." },
    ],
  }),
});

type Stats = {
  attempts: number;
  correct: number;
  bookmarks: number;
  mistakes: number;
};

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { profile, updateProfile } = useProfile(user);
  const [stats, setStats] = useState<Stats>({ attempts: 0, correct: 0, bookmarks: 0, mistakes: 0 });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { next: "/profile" } });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [a, ac, b, m] = await Promise.all([
        supabase.from("attempts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("attempts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_correct", true),
        supabase.from("bookmarks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("mistakes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setStats({
        attempts: a.count ?? 0,
        correct: ac.count ?? 0,
        bookmarks: b.count ?? 0,
        mistakes: m.count ?? 0,
      });
    })();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setYear(profile.exam_year ? String(profile.exam_year) : "");
    }
  }, [profile]);

  const initials = useMemo(() => {
    const src = profile?.display_name || user?.email || "E";
    return src
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile, user]);

  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";

  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;

  async function saveProfile() {
    setSaving(true);
    await updateProfile({
      display_name: name.trim() || null,
      exam_year: year ? Number(year) : null,
    });
    setSaving(false);
    setEditing(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <header className="flex items-center justify-between px-5 pt-6 pb-3">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">Profile</h1>
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
            aria-label="Edit profile"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </header>

        {/* Hero */}
        <section className="mx-5 mt-3 bg-hero shadow-card-premium relative overflow-hidden rounded-3xl border border-white/5 p-6">
          <div className="bg-primary/30 absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl" />
          <div className="bg-gold/10 absolute -bottom-20 -left-12 h-44 w-44 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? "avatar"}
                  className="h-20 w-20 rounded-2xl border-2 border-white/20 object-cover shadow-glow"
                />
              ) : (
                <div className="bg-gradient-primary shadow-glow flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-primary-foreground border-2 border-white/20">
                  {initials}
                </div>
              )}
              {profile?.is_premium && (
                <div className="absolute -bottom-1 -right-1 rounded-full bg-gold p-1.5 shadow-lg">
                  <Crown className="h-3.5 w-3.5 text-black" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display truncate text-lg font-bold text-white">
                {profile?.display_name || "Student"}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
                <Mail className="h-3 w-3" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/60">
                <CalendarDays className="h-3 w-3" />
                <span>Joined {joined}</span>
              </div>
            </div>
          </div>

          {editing && (
            <div className="relative mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
              <label className="block">
                <span className="text-[11px] font-medium text-white/70">Display name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-white/70">Exam year</span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  placeholder="2026"
                />
              </label>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </section>

        {/* Stats grid */}
        <section className="mt-6 px-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your progress
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Target}
              label="Total Attempts"
              value={stats.attempts}
              tint="text-primary"
            />
            <StatCard
              icon={TrendingUp}
              label="Accuracy"
              value={`${accuracy}%`}
              tint="text-emerald-500"
            />
            <StatCard
              icon={BookmarkCheck}
              label="Bookmarks"
              value={stats.bookmarks}
              tint="text-gold"
            />
            <StatCard
              icon={NotebookPen}
              label="Mistakes"
              value={stats.mistakes}
              tint="text-rose-500"
            />
          </div>
        </section>

        {/* Mock test history */}
        <section className="mt-6 px-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mock test history
          </h3>
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">No mock tests yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Take your first mock test to see performance history here.
            </p>
          </div>
        </section>

        {/* Premium */}
        <section className="mt-6 px-5">
          <div className="flex items-center justify-between rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/20">
                <Crown className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {profile?.is_premium ? "Premium member" : "Free plan"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {profile?.is_premium
                    ? profile.premium_expires_at
                      ? `Renews ${new Date(profile.premium_expires_at).toLocaleDateString()}`
                      : "Lifetime access"
                    : "Unlock handwritten notes and analytics"}
                </p>
              </div>
            </div>
            {!profile?.is_premium && (
              <button className="rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-black">
                Upgrade
              </button>
            )}
          </div>
        </section>

        {/* Sign out */}
        <section className="mt-6 px-5">
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className={`h-5 w-5 ${tint}`} />
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
