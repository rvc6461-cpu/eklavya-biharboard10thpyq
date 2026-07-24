import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Flag, Check, X, Timer,
  Trophy, RotateCcw, AlertTriangle,
} from "lucide-react";
import { getSubject, type Question } from "@/lib/pyq/data";
import { usePyqStore } from "@/lib/pyq/store";
import { saveMockTest } from "@/lib/pyq/cloud";

const TARGET = 100;
const TIME_LIMIT_SEC = 100 * 60;

type QuizQ = Question & { chapterId: string; chapterName: string };

export const Route = createFileRoute("/mock-test/$subject")({
  loader: ({ params }) => {
    const subject = getSubject(params.subject);
    if (!subject) throw notFound();
    return { subject };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.subject.name ?? "Mock"} Mock Test · Eklavya` },
      { name: "description", content: `Full-length mock test for ${loaderData?.subject.name ?? ""}.` },
    ],
  }),
  errorComponent: () => <div className="p-6 text-center">Something went wrong.</div>,
  notFoundComponent: () => <div className="p-6 text-center">Subject not found.</div>,
  component: MockTestRunner,
});

function shuffle<T>(arr: T[], seed: number): T[] {
  let s = seed || 1;
  const a = arr.slice();
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MockTestRunner() {
  const { subject } = Route.useLoaderData();
  const navigate = useNavigate();
  const { recordAttempt } = usePyqStore();

  const pool: QuizQ[] = useMemo(
    () =>
      subject.chapters.flatMap((c) =>
        c.questions.map((q) => ({ ...q, chapterId: c.id, chapterName: c.name })),
      ),
    [subject],
  );

  const [seed, setSeed] = useState(() => Date.now());
  const questions = useMemo(() => shuffle(pool, seed).slice(0, TARGET), [pool, seed]);
  const total = questions.length;
  const shortfall = total < TARGET;

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [idx, setIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [remaining, setRemaining] = useState(TIME_LIMIT_SEC);
  const startAtRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submitted || total === 0) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          finish();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, total]);

  if (total === 0) {
    return (
      <div className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto max-w-md space-y-4">
          <Link to="/mock-test" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-300" />
            <p className="mt-3 font-display font-bold">No questions available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {subject.name} doesn't have any PYQs yet. Please check back soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[idx];

  const setAnswer = (opt: number) => {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [idx]: opt }));
  };
  const toggleMark = () => setMarked((m) => ({ ...m, [idx]: !m[idx] }));
  const goto = (i: number) => { setIdx(i); setShowPalette(false); };

  function finish() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    // Record each answered question as an attempt for the mistake book / stats.
    Object.entries(answers).forEach(([i, sel]) => {
      const q = questions[Number(i)];
      if (!q) return;
      recordAttempt({
        questionId: q.id,
        subjectId: subject.id,
        chapterId: q.chapterId,
        selected: sel,
        correct: sel === q.answer,
        at: Date.now(),
      });
    });
    const score = questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
    const timeTaken = Math.round((Date.now() - startAtRef.current) / 1000);
    void saveMockTest({
      subjectId: subject.id,
      testName: `${subject.name} Mock Test`,
      score,
      totalQuestions: total,
      timeTakenSeconds: timeTaken,
    });
  }

  const restart = () => {
    setAnswers({}); setMarked({}); setIdx(0);
    setSubmitted(false); submittedRef.current = false;
    setRemaining(TIME_LIMIT_SEC);
    startAtRef.current = Date.now();
    setSeed(Date.now());
  };

  if (submitted) {
    return <MockResults questions={questions} answers={answers} subjectName={subject.name}
      timeTakenSec={Math.min(TIME_LIMIT_SEC, TIME_LIMIT_SEC - remaining)}
      onRetake={restart} onExit={() => navigate({ to: "/" })} />;
  }

  const answered = Object.keys(answers).length;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between gap-3 px-5 pt-6 pb-4">
          <button
            onClick={() => navigate({ to: "/mock-test" })}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {subject.name}
            </p>
            <p className="truncate font-display text-sm font-bold">Mock Test</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-2xl border px-3 h-10 ${remaining < 300 ? "border-destructive/60 bg-destructive/15 text-destructive" : "border-border bg-card text-foreground"}`}>
            <Timer className="h-4 w-4" />
            <span className="font-display text-sm font-bold tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </header>

        {shortfall && (
          <div className="mx-5 mb-3 flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-[11px] leading-relaxed text-amber-100">
              Only {total} PYQs available for {subject.name}. Test length is limited to available questions.
            </p>
          </div>
        )}

        <div className="px-5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span>Q {idx + 1} of {total} · {answered} answered</span>
            <button onClick={() => setShowPalette((v) => !v)} className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
              Palette
            </button>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-gradient-primary h-full rounded-full transition-all"
              style={{ width: `${(answered / total) * 100}%` }} />
          </div>
        </div>

        {showPalette && (
          <div className="mx-5 mt-4 rounded-2xl border border-border bg-card p-3">
            <div className="grid grid-cols-8 gap-2">
              {questions.map((_q, i) => {
                const isAns = answers[i] != null;
                const isMark = marked[i];
                const cls = i === idx
                  ? "bg-primary text-primary-foreground"
                  : isMark
                    ? "bg-amber-500/80 text-black"
                    : isAns
                      ? "bg-success/70 text-success-foreground"
                      : "bg-muted text-muted-foreground";
                return (
                  <button key={i} onClick={() => goto(i)}
                    className={`h-8 rounded-lg text-[11px] font-bold ${cls}`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-success/70" />Answered</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500/80" />Marked</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-muted" />Skipped</span>
            </div>
            <button
              onClick={finish}
              className="bg-gradient-primary shadow-glow mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-display font-bold text-primary-foreground"
            >
              Submit test
            </button>
          </div>
        )}

        <main className="mt-5 space-y-5 px-5">
          <div className="bg-gradient-card rounded-3xl border border-border p-5 shadow-card-premium">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{question.chapterName}</p>
            <p className="font-display mt-1 text-base leading-relaxed font-semibold">{question.text}</p>
          </div>

          <div className="space-y-2.5">
            {question.options.map((opt, i) => {
              const selected = answers[idx] === i;
              return (
                <button key={i} type="button" onClick={() => setAnswer(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    selected ? "border-primary/60 bg-primary/10" : "border-border bg-card hover:border-primary/40"
                  }`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>{String.fromCharCode(65 + i)}</div>
                  <span className="text-sm font-medium leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>

          <button onClick={toggleMark}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold ${
              marked[idx] ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-border bg-card text-muted-foreground"
            }`}>
            <Flag className="h-4 w-4" /> {marked[idx] ? "Marked for review" : "Mark for review"}
          </button>
        </main>

        <div className="fixed right-0 bottom-0 left-0 mx-auto max-w-md px-5 pb-5">
          <div className="flex gap-2">
            <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}
              className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 font-display font-bold disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            {idx + 1 >= total ? (
              <button onClick={finish}
                className="bg-gradient-primary shadow-glow flex flex-1 items-center justify-center gap-1 rounded-2xl py-3 font-display font-bold text-primary-foreground">
                Submit
              </button>
            ) : (
              <button onClick={() => setIdx(Math.min(total - 1, idx + 1))}
                className="bg-gradient-primary shadow-glow flex flex-1 items-center justify-center gap-1 rounded-2xl py-3 font-display font-bold text-primary-foreground">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockResults({
  questions, answers, subjectName, timeTakenSec, onRetake, onExit,
}: {
  questions: QuizQ[]; answers: Record<number, number>; subjectName: string;
  timeTakenSec: number; onRetake: () => void; onExit: () => void;
}) {
  const total = questions.length;
  let correct = 0, wrong = 0, unanswered = 0;
  const perChapter = new Map<string, { name: string; correct: number; total: number }>();
  questions.forEach((q, i) => {
    const bucket = perChapter.get(q.chapterId) ?? { name: q.chapterName, correct: 0, total: 0 };
    bucket.total += 1;
    const sel = answers[i];
    if (sel == null) unanswered += 1;
    else if (sel === q.answer) { correct += 1; bucket.correct += 1; }
    else wrong += 1;
    perChapter.set(q.chapterId, bucket);
  });
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const acc = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;
  const mins = Math.floor(timeTakenSec / 60);
  const secs = timeTakenSec % 60;

  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-10 text-foreground">
      <div className="mx-auto max-w-md space-y-4">
        <div className="bg-hero relative overflow-hidden rounded-3xl border border-white/5 p-6 text-center shadow-card-premium">
          <div className="bg-gold/20 absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl" />
          <div className="relative">
            <div className="bg-gradient-gold shadow-gold mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
              <Trophy className="h-8 w-8 text-gold-foreground" />
            </div>
            <h2 className="font-display mt-4 text-2xl font-bold">{subjectName} · Result</h2>
            <p className="font-display mt-2 text-5xl font-bold text-gradient-gold">{pct}%</p>
            <p className="mt-1 text-sm text-muted-foreground">Score {correct} / {total}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Correct" value={correct} tone="success" icon={<Check className="h-4 w-4" />} />
          <StatTile label="Wrong" value={wrong} tone="destructive" icon={<X className="h-4 w-4" />} />
          <StatTile label="Skipped" value={unanswered} tone="muted" icon={<Flag className="h-4 w-4" />} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Accuracy" value={`${acc}%`} tone="primary" />
          <StatTile label="Time taken" value={`${mins}m ${secs}s`} tone="primary" icon={<Timer className="h-4 w-4" />} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-display text-sm font-bold">Chapter-wise performance</p>
          <div className="mt-3 space-y-2.5">
            {Array.from(perChapter.values()).map((c) => {
              const p = c.total ? Math.round((c.correct / c.total) * 100) : 0;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span className="truncate">{c.name}</span>
                    <span className="font-bold text-foreground">{c.correct}/{c.total} · {p}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="bg-gradient-primary h-full rounded-full" style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={onRetake}
          className="bg-gradient-primary shadow-glow flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display font-bold text-primary-foreground">
          <RotateCcw className="h-5 w-5" /> Retake test
        </button>
        <button onClick={onExit}
          className="block w-full rounded-2xl border border-border bg-card py-4 text-center font-display font-bold">
          Back to home
        </button>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone, icon }: {
  label: string; value: string | number; tone: "success" | "destructive" | "muted" | "primary"; icon?: React.ReactNode;
}) {
  const bg =
    tone === "success" ? "bg-success/15 text-success"
      : tone === "destructive" ? "bg-destructive/15 text-destructive"
        : tone === "primary" ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>{icon ?? null}</div>
      <p className="font-display mt-1 text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
