import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { useLiveStats } from "@/hooks/useLiveStats";
import { usePyqStore } from "@/lib/pyq/store";
import { DAILY_GOALS, getDailyGoal, setDailyGoal, streakSummary, todayCount } from "@/lib/pyq/smart";
import { fetchLookupMaps } from "@/lib/pyq/db";
import {
  BookOpen,
  FileText,
  FlaskConical,
  GraduationCap,
  Sparkles,
  NotebookPen,
  LineChart,
  Lock,
  Flame,
  Target,
  Trophy,
  Bell,
  ChevronRight,
  Play,
  Calendar,
  Quote,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { fetchSubjects, type DbSubject } from "@/lib/pyq/db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eklavya — Bihar Board 10th PYQ, Mock Test & Notes" },
      {
        name: "description",
        content:
          "Premium Bihar Board Class 10 preparation: chapter-wise PYQs, full mock tests, formula sheets, analytics & handwritten notes.",
      },
      { property: "og:title", content: "Eklavya — Bihar Board 10th Prep" },
      {
        property: "og:description",
        content: "No Distraction. Just Practice. Improve Every Day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const DAYS_TO_EXAM = 142;

function Home() {
  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <div className="mx-auto max-w-md">
        <Header />
        <main className="space-y-6 px-5">
          <HeroCard />
          <StatsRow />
          <DailyGoalCard />
          <ContinueCard />
          <SectionTitle title="Subjects" action="View all" />
          <Subjects />
          <SectionTitle title="Study tools" />
          <ToolsGrid />
          <PremiumCard />
          <RecommendationCard />
          <StreakCard />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

function Header() {
  const { user } = useAuth();
  const { profile } = useProfile(user);
  const name = profile?.display_name || user?.email?.split("@")[0] || "Guest";
  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-5">
      <Link to={user ? "/profile" : "/auth"} className="flex items-center gap-3">
        <div className="bg-gradient-primary shadow-glow flex h-11 w-11 items-center justify-center rounded-2xl">
          <GraduationCap className="h-6 w-6 text-primary-foreground" strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            {user ? "Good morning" : "Welcome"}
          </p>
          <h1 className="font-display text-base leading-tight font-bold">{name}</h1>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <Link to="/search" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card" aria-label="Search">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
        </Link>
        <Link
          to={user ? "/notifications" : "/auth"}
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card"
          aria-label={user ? "Notifications" : "Sign in"}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-gold" />
        </Link>
      </div>
    </header>
  );
}

function HeroCard() {
  return (
    <div className="bg-hero shadow-card-premium relative overflow-hidden rounded-3xl border border-white/5 p-6">
      <div className="bg-primary/30 absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl" />
      <div className="bg-gold/10 absolute -bottom-20 -left-12 h-44 w-44 rounded-full blur-3xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
          <Calendar className="h-3 w-3 text-gold" />
          <span className="text-[11px] font-semibold tracking-wide">
            BSEB 2026 · {DAYS_TO_EXAM} days left
          </span>
        </div>
        <h2 className="font-display mt-4 text-2xl leading-tight font-bold">
          No distraction. <br />
          <span className="text-gradient-gold">Just practice.</span>
        </h2>
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-white/5 bg-black/20 p-3">
          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            "Sapne wo nahi jo neend mein aaye, sapne wo hain jo neend hi na aane de."
          </p>
        </div>
      </div>
    </div>
  );
}

function StatsRow() {
  const { user } = useAuth();
  const { stats } = useLiveStats(user);
  const items = [
    { icon: Flame, label: "Streak", value: user ? String(stats.currentStreak) : "0", suffix: "d", tint: "text-gold" },
    { icon: Target, label: "Accuracy", value: user ? String(stats.accuracy) : "0", suffix: "%", tint: "text-primary" },
    { icon: Trophy, label: "Solved", value: user ? formatK(stats.attempts) : "0", suffix: "", tint: "text-success" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((s) => (
        <div
          key={s.label}
          className="bg-gradient-card rounded-2xl border border-border p-3.5"
        >
          <s.icon className={`h-4 w-4 ${s.tint}`} strokeWidth={2.4} />
          <p className="mt-2.5 font-display text-xl font-bold leading-none">
            {s.value}
            <span className="text-xs font-semibold text-muted-foreground">{s.suffix}</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function formatK(n: number) {
  if (n < 1000) return String(n);
  return (n / 1000).toFixed(1) + "k";
}

function ContinueCard() {
  return (
    <Link
      to="/practice"
      className="bg-gradient-primary shadow-glow group flex w-full items-center gap-4 rounded-2xl p-4 text-left"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
        <Play className="h-5 w-5 fill-white text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wider text-white/70 uppercase">
          Continue practice
        </p>
        <p className="truncate font-display text-sm font-bold text-white">
          Math · Trigonometry · Q 15/50
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-[30%] rounded-full bg-gold" />
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-white/70 transition group-hover:translate-x-1" />
    </Link>
  );
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <h3 className="font-display text-base font-bold">{title}</h3>
      {action && (
        <Link to="/practice" className="text-xs font-semibold text-primary">
          {action}
        </Link>
      )}
    </div>
  );
}

type Subject = {
  id?: string;
  name: string;
  short: string;
  progress: number;
  chapters: string;
  hue: string;
  glyph: string;
};

const SUBJECTS: Subject[] = [
  { name: "Mathematics", short: "Math", progress: 64, chapters: "9 / 15", hue: "from-indigo-500 to-violet-600", glyph: "∑" },
  { name: "Science", short: "Sci", progress: 48, chapters: "7 / 14", hue: "from-emerald-500 to-teal-600", glyph: "⚛" },
  { name: "Social Science", short: "SST", progress: 35, chapters: "5 / 20", hue: "from-amber-500 to-orange-600", glyph: "❖" },
  { name: "English", short: "Eng", progress: 72, chapters: "8 / 11", hue: "from-sky-500 to-blue-600", glyph: "✎" },
  { name: "Hindi", short: "Hin", progress: 58, chapters: "6 / 10", hue: "from-rose-500 to-pink-600", glyph: "ह" },
];

function Subjects() {
  const [dbSubjects, setDbSubjects] = useState<DbSubject[]>([]);
  useEffect(() => { fetchSubjects().then(setDbSubjects); }, []);
  const subjects = dbSubjects.length ? dbSubjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    short: subject.short,
    progress: 0,
    chapters: "—",
    hue: subject.hue,
    glyph: subject.glyph,
  })) : SUBJECTS;
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3">
        {subjects.map((s) => (
          <SubjectCard key={s.name} subject={s} />
        ))}
      </div>
    </div>
  );
}

function SubjectCard({ subject }: { subject: Subject }) {
  const content = (
    <>
      <div
        className={`bg-gradient-to-br ${subject.hue} flex h-11 w-11 items-center justify-center rounded-xl font-display text-xl font-bold text-white shadow-lg`}
      >
        {subject.glyph}
      </div>
      <p className="mt-3 font-display text-sm font-bold">{subject.name}</p>
      <p className="text-[11px] text-muted-foreground">{subject.chapters === "—" ? "Open to explore" : `${subject.chapters} chapters`}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`bg-gradient-to-r ${subject.hue} h-full rounded-full`}
            style={{ width: `${subject.progress}%` }}
          />
        </div>
        <span className="ml-2 text-[11px] font-bold text-foreground">{subject.progress}%</span>
      </div>
    </>
  );
  return (
    subject.id ? <Link to="/practice/$subject" params={{ subject: subject.id }} className="bg-gradient-card shadow-card-premium relative block w-44 shrink-0 overflow-hidden rounded-2xl border border-border p-4 text-left">{content}</Link> : <Link to="/practice" className="bg-gradient-card shadow-card-premium relative block w-44 shrink-0 overflow-hidden rounded-2xl border border-border p-4 text-left">{content}</Link>
  );
}

type Tool = { icon: LucideIcon; label: string; sub: string; tint: string; bg: string; to?: string };
const TOOLS: Tool[] = [
  { icon: BookOpen, label: "PYQ Practice", sub: "Chapter-wise · Offline", tint: "text-indigo-300", bg: "bg-indigo-500/15", to: "/practice" },
  { icon: FlaskConical, label: "Mock Test", sub: "Full length · Live", tint: "text-emerald-300", bg: "bg-emerald-500/15", to: "/mock-test" },
  { icon: FileText, label: "PYQ Papers", sub: "PDF library", tint: "text-sky-300", bg: "bg-sky-500/15", to: "/library" },
  { icon: Sparkles, label: "Formula Sheet", sub: "Quick revision", tint: "text-amber-300", bg: "bg-amber-500/15", to: "/library/formulas" },
  { icon: NotebookPen, label: "Mistake Book", sub: "Learn from errors", tint: "text-rose-300", bg: "bg-rose-500/15", to: "/mistakes" },
  { icon: LineChart, label: "Analytics", sub: "Track progress", tint: "text-violet-300", bg: "bg-violet-500/15", to: "/analytics" },
];

function ToolsGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TOOLS.map((t) => {
        const inner = (
          <>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.bg}`}>
              <t.icon className={`h-5 w-5 ${t.tint}`} strokeWidth={2.2} />
            </div>
            <p className="mt-3 font-display text-sm font-bold">{t.label}</p>
            <p className="text-[11px] text-muted-foreground">{t.sub}</p>
          </>
        );
        const cls = "bg-gradient-card rounded-2xl border border-border p-4 text-left transition hover:border-primary/50";
        return t.to ? (
          <Link key={t.label} to={t.to} className={cls}>{inner}</Link>
        ) : (
          <button key={t.label} type="button" className={cls}>{inner}</button>
        );
      })}
    </div>
  );
}

function PremiumCard() {
  return (
    <Link to="/premium" className="relative block overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-amber-500/20 via-card to-card p-5 shadow-gold">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gold/30 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="bg-gradient-gold shadow-gold flex h-14 w-14 items-center justify-center rounded-2xl">
          <Crown className="h-7 w-7 text-gold-foreground" strokeWidth={2.4} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-bold tracking-wider text-gold uppercase">
              Premium
            </p>
            <Lock className="h-3 w-3 text-gold" />
          </div>
          <p className="font-display text-base font-bold leading-tight">
            Handwritten Notes
          </p>
          <p className="text-[11px] text-muted-foreground">
            All subjects · Lifetime access
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-gold" />
      </div>
    </Link>
  );
}

function RecommendationCard() {
  const { state } = usePyqStore();
  const [chapterName, setChapterName] = useState("your weakest chapter");
  const rows = Object.values(state.attempts);
  const chapterRows = new Map<string, { total: number; correct: number }>();
  for (const attempt of rows) {
    const row = chapterRows.get(attempt.chapterId) ?? { total: 0, correct: 0 };
    row.total += 1;
    if (attempt.correct) row.correct += 1;
    chapterRows.set(attempt.chapterId, row);
  }
  const weakest = Array.from(chapterRows.entries()).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0];
  const accuracy = weakest ? Math.round(weakest[1].correct / weakest[1].total * 100) : 0;
  useEffect(() => { if (weakest) void fetchLookupMaps().then((maps) => setChapterName(maps.chapters[weakest[0]]?.name ?? "your weakest chapter")); }, [weakest?.[0]]);
  return (
    <div className="bg-gradient-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-[11px] font-bold tracking-wider text-primary uppercase">
          Smart suggestion
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed">
         {weakest ? <><span className="font-bold">{chapterName}</span> accuracy is{" "}<span className={`font-bold ${accuracy < 60 ? "text-destructive" : accuracy > 80 ? "text-success" : "text-primary"}`}>{accuracy}%</span>. {accuracy < 60 ? "Revise this chapter and solve 20 more questions." : accuracy > 80 ? "Excellent! You are ready for the next chapter." : "Keep practising to strengthen this chapter."}</> : <>Complete a practice set to unlock your personalised revision suggestion.</>}
      </p>
      <Link
        to="/mistakes"
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary"
      >
        Start revision <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function StreakCard() {
  const { state } = usePyqStore();
  const streak = streakSummary(state.attemptLog);
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const done = days.map((_d, i) => { const date = new Date(monday); date.setDate(monday.getDate() + i); return streak.active.has(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`); });
  return (
    <div className="bg-gradient-card rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-bold">This week</p>
           <p className="text-[11px] text-muted-foreground">{streak.weekly} of 7 days · keep going</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1">
          <Flame className="h-3.5 w-3.5 text-gold" />
          <span className="text-xs font-bold text-gold">{streak.daily}</span>
        </div>
      </div>
      <div className="flex justify-between">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-bold ${
                done[i]
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done[i] ? "✓" : ""}
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyGoalCard() {
  const { state } = usePyqStore();
  const [goal, setGoalState] = useState(20);
  useEffect(() => { setGoalState(getDailyGoal()); }, []);
  const solved = todayCount(state.attemptLog);
  const pct = Math.min(100, Math.round(solved / goal * 100));
  return <div className="bg-gradient-card rounded-2xl border border-border p-4"><div className="flex items-center justify-between"><div><p className="font-display text-sm font-bold">Daily goal</p><p className="text-[11px] text-muted-foreground">{solved} of {goal} questions today</p></div><span className="font-display text-lg font-bold text-primary">{pct}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="bg-gradient-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} /></div><div className="mt-3 grid grid-cols-3 gap-2">{DAILY_GOALS.map((value) => <button key={value} onClick={() => { setDailyGoal(value); setGoalState(value); }} className={`rounded-xl py-2 text-xs font-bold ${goal === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{value}/day</button>)}</div></div>;
}

function BottomNav() {
  const items = [
    { icon: GraduationCap, label: "Home", active: true, to: "/" },
    { icon: BookOpen, label: "Practice", to: "/practice" },
    { icon: FlaskConical, label: "Mock", to: "/mock-test" },
    { icon: LineChart, label: "Stats", to: "/analytics" },
  ];
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 mx-auto max-w-md px-5 pb-5">
      <div className="shadow-card-premium flex items-center justify-around rounded-3xl border border-border bg-card/95 px-2 py-2.5 backdrop-blur-xl">
        {items.map((it) => (
          <Link
            key={it.label}
            to={it.to}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 transition ${
              it.active ? "bg-primary/15 text-primary" : "text-muted-foreground"
            }`}
          >
            <it.icon className="h-5 w-5" strokeWidth={it.active ? 2.6 : 2} />
            <span className="text-[10px] font-semibold">{it.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
