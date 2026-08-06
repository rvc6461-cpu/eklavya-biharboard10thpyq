import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Check, X, Target, Timer, Flame, Trophy, Lock, Sparkles } from "lucide-react";
import { usePyqStore } from "@/lib/pyq/store";
import { achievements, smartRevision, streakSummary } from "@/lib/pyq/smart";
import { fetchLookupMaps } from "@/lib/pyq/db";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [
    { title: "Learning Analytics · Eklavya" },
    { name: "description", content: "Accuracy, progress, streaks, smart revision and achievement insights." },
    { property: "og:title", content: "Learning Analytics · Eklavya" },
    { property: "og:description", content: "Track your Bihar Board preparation growth." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { state } = usePyqStore();
  const [labels, setLabels] = useState<{ subjects: Record<string, { name: string }>; chapters: Record<string, { name: string }> }>({ subjects: {}, chapters: {} });
  useEffect(() => { void fetchLookupMaps().then((maps) => setLabels({ subjects: maps.subjects, chapters: maps.chapters })); }, []);
  const log = state.attemptLog;
  const summary = streakSummary(log);
  const correct = log.filter((a) => a.correct).length;
  const wrong = log.length - correct;
  const accuracy = log.length ? Math.round(correct / log.length * 100) : 0;
  const bySubject = useMemo(() => group(log, "subjectId"), [log]);
  const byChapter = useMemo(() => group(log, "chapterId"), [log]);
  const chapters = Object.entries(byChapter).sort((a, b) => b[1].accuracy - a[1].accuracy);
  const weekly = recent(log, 7);
  const monthly = recent(log, 30);
  const badges = achievements(state);
  const averageSeconds = log.length > 1 ? Math.max(0, Math.round((Math.max(...log.map((a) => a.at)) - Math.min(...log.map((a) => a.at))) / 1000 / log.length)) : 0;
  return <div className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-md">
    <header className="flex items-center justify-between px-5 pt-6 pb-4"><Link to="/" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"><ArrowLeft className="h-5 w-5" /></Link><h1 className="font-display text-base font-bold">Learning Analytics</h1><div className="w-10" /></header>
    <main className="space-y-5 px-5">
      <div className="bg-hero rounded-3xl border border-border p-5 shadow-card-premium"><p className="text-[11px] font-bold text-gold">OVERALL ACCURACY</p><div className="mt-2 flex items-end justify-between"><p className="font-display text-5xl font-bold text-gradient-gold">{accuracy}%</p><BarChart3 className="h-10 w-10 text-primary" /></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="bg-gradient-primary h-full rounded-full" style={{ width: `${accuracy}%` }} /></div></div>
      <div className="grid grid-cols-3 gap-2"><Metric icon={Check} label="Correct" value={correct} tone="text-success" /><Metric icon={X} label="Wrong" value={wrong} tone="text-destructive" /><Metric icon={Target} label="Solved" value={log.length} tone="text-primary" /><Metric icon={Timer} label="Avg / Q" value={`${averageSeconds}s`} tone="text-gold" /><Metric icon={Flame} label="Daily" value={`${summary.daily}d`} tone="text-gold" /><Metric icon={Trophy} label="Best" value={`${summary.best}d`} tone="text-success" /></div>
      <Section title="Progress"><div className="grid grid-cols-2 gap-3"><Progress label="This week" solved={weekly.total} accuracy={weekly.accuracy} /><Progress label="This month" solved={monthly.total} accuracy={monthly.accuracy} /></div><p className="mt-3 text-[11px] text-muted-foreground">Weekly streak {summary.weekly}/7 days · Monthly streak {summary.monthly}/30 days</p></Section>
      <Section title="Subject-wise accuracy">{Object.entries(bySubject).length ? Object.entries(bySubject).map(([id, row]) => <AccuracyRow key={id} label={labels.subjects[id]?.name ?? `Subject ${short(id)}`} value={row.accuracy} total={row.total} />) : <Empty />}</Section>
      <Section title="Chapter-wise accuracy">{chapters.length ? chapters.map(([id, row]) => <div key={id} className="mb-3"><AccuracyRow label={labels.chapters[id]?.name ?? `Chapter ${short(id)}`} value={row.accuracy} total={row.total} /><p className={`mt-1 text-[10px] ${row.accuracy < 60 ? "text-destructive" : row.accuracy > 80 ? "text-success" : "text-muted-foreground"}`}><Sparkles className="mr-1 inline h-3 w-3" />{smartRevision(row.accuracy)}</p></div>) : <Empty />}</Section>
      <div className="grid grid-cols-2 gap-3"><Section title="Weak chapters">{chapters.filter(([, r]) => r.accuracy < 60).slice(0, 4).map(([id, r]) => <p key={id} className="mt-2 text-xs text-destructive">{labels.chapters[id]?.name ?? `Chapter ${short(id)}`} · {r.accuracy}%</p>)}{!chapters.some(([, r]) => r.accuracy < 60) && <Empty />}</Section><Section title="Strong chapters">{chapters.filter(([, r]) => r.accuracy > 80).slice(0, 4).map(([id, r]) => <p key={id} className="mt-2 text-xs text-success">{labels.chapters[id]?.name ?? `Chapter ${short(id)}`} · {r.accuracy}%</p>)}{!chapters.some(([, r]) => r.accuracy > 80) && <Empty />}</Section></div>
      <Section title="Achievement badges"><div className="grid grid-cols-2 gap-2">{badges.map((badge) => <div key={badge.id} className={`rounded-xl border p-3 ${badge.unlocked ? "border-gold/40 bg-gold/10" : "border-border bg-muted/20 opacity-60"}`}><div className="flex items-center gap-2">{badge.unlocked ? <Trophy className="h-4 w-4 text-gold" /> : <Lock className="h-4 w-4 text-muted-foreground" />}<p className="font-display text-xs font-bold">{badge.label}</p></div><p className="mt-1 text-[10px] text-muted-foreground">{badge.detail}</p></div>)}</div></Section>
    </main>
  </div></div>;
}

function group(log: ReturnType<typeof usePyqStore>["state"]["attemptLog"], key: "subjectId" | "chapterId") { const out: Record<string, { total: number; correct: number; accuracy: number }> = {}; for (const a of log) { const row = out[a[key]] ?? { total: 0, correct: 0, accuracy: 0 }; row.total++; if (a.correct) row.correct++; row.accuracy = Math.round(row.correct / row.total * 100); out[a[key]] = row; } return out; }
function recent(log: ReturnType<typeof usePyqStore>["state"]["attemptLog"], days: number) { const rows = log.filter((a) => a.at >= Date.now() - days * 86400000); const correct = rows.filter((a) => a.correct).length; return { total: rows.length, accuracy: rows.length ? Math.round(correct / rows.length * 100) : 0 }; }
function short(id: string) { return id.length > 8 ? id.slice(0, 6) : id; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-border bg-card p-4"><h2 className="font-display text-sm font-bold">{title}</h2><div className="mt-3">{children}</div></section>; }
function Metric({ icon: Icon, label, value, tone }: { icon: typeof Check; label: string; value: string | number; tone: string }) { return <div className="rounded-2xl border border-border bg-card p-3"><Icon className={`h-4 w-4 ${tone}`} /><p className="font-display mt-2 text-lg font-bold">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>; }
function Progress({ label, solved, accuracy }: { label: string; solved: number; accuracy: number }) { return <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className="font-display mt-1 text-xl font-bold">{solved}</p><p className="text-[10px] text-primary">{accuracy}% accuracy</p></div>; }
function AccuracyRow({ label, value, total }: { label: string; value: number; total: number }) { return <div className="mb-2"><div className="flex justify-between text-[11px]"><span>{label}</span><span className="font-bold">{value}% · {total} solved</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="bg-gradient-primary h-full" style={{ width: `${value}%` }} /></div></div>; }
function Empty() { return <p className="text-[11px] text-muted-foreground">Complete questions to unlock these insights.</p>; }