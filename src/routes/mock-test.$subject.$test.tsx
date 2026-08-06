import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Flag, Check, X, Timer,
  Trophy, RotateCcw, AlertTriangle, ListChecks, ArrowRight, Bookmark, BookmarkCheck, Share2, Eye,
} from "lucide-react";
import type { Question } from "@/lib/pyq/data";
import {
  fetchSubjectById, fetchChaptersBySubject, fetchSubjectQuestionIds,
  fetchSubjectQuestionsByIds, toClientQuestion, type DbSubject,
} from "@/lib/pyq/db";
import { usePyqStore } from "@/lib/pyq/store";
import { saveMockTest } from "@/lib/pyq/cloud";
import {
  MOCK_TARGET, MOCK_TESTS_PER_SUBJECT, pickTestQuestionIds, saveAttempt, bestFor,
} from "@/lib/pyq/mockStore";

const TARGET = MOCK_TARGET;
const TIME_LIMIT_SEC = 120 * 60;
const STORAGE_PREFIX = "eklavya.mock.v2.";

type QuizQ = Question & { chapterId: string; chapterName: string };

type SavedState = {
  order: { id: string; opts: number[] }[];
  answers: Record<number, number>;
  marked: Record<number, boolean>;
  visited: Record<number, boolean>;
  idx: number;
  remaining: number;
  startedAt: number;
};

export const Route = createFileRoute("/mock-test/$subject/$test")({
  head: () => ({
    meta: [
      { title: "Full Mock Test · Eklavya" },
      { name: "description", content: "Full-length subject mock test with timer, palette, result analytics and answer review." },
    ],
  }),
  errorComponent: () => <div className="p-6 text-center">Something went wrong.</div>,
  notFoundComponent: () => <div className="p-6 text-center">Mock test not found.</div>,
  component: MockTestLoaderShell,
});

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function readSavedIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedState;
    return Array.isArray(parsed?.order) ? parsed.order.map((o) => o.id) : [];
  } catch {
    return [];
  }
}

function MockTestLoaderShell() {
  const { subject: subjectId, test } = Route.useParams();
  const testNo = Math.min(MOCK_TESTS_PER_SUBJECT, Math.max(1, Number(test) || 1));
  const [subject, setSubject] = useState<DbSubject | null>(null);
  const [pool, setPool] = useState<QuizQ[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const storageKey = `${STORAGE_PREFIX}${subjectId}.${testNo}`;

  useEffect(() => {
    let cancelled = false;
    setPool(null);
    void (async () => {
      const [subj, chapters, allIds] = await Promise.all([
        fetchSubjectById(subjectId),
        fetchChaptersBySubject(subjectId),
        fetchSubjectQuestionIds(subjectId),
      ]);
      if (cancelled) return;
      const uniqueIds = Array.from(new Set(allIds));
      const valid = new Set(uniqueIds);
      const resumeIds = readSavedIds(storageKey).filter((id) => valid.has(id));
      const picked = resumeIds.length ? resumeIds : pickTestQuestionIds(uniqueIds, testNo);
      const rows = await fetchSubjectQuestionsByIds(subjectId, picked);
      if (cancelled) return;
      const chapterName = new Map(chapters.map((c) => [c.id, c.name]));
      const seen = new Set<string>();
      const qs: QuizQ[] = [];
      for (const row of rows) {
        if (row.subject_id !== subjectId || seen.has(row.id)) continue;
        seen.add(row.id);
        qs.push({
          ...toClientQuestion(row),
          chapterId: row.chapter_id,
          chapterName: chapterName.get(row.chapter_id) ?? "General",
        });
      }
      setSubject(subj);
      setPool(qs);
    })();
    return () => { cancelled = true; };
  }, [subjectId, testNo, storageKey, nonce]);

  if (!subject || !pool) {
    return (
      <div className="min-h-screen bg-background p-6 text-center text-sm text-muted-foreground">
        Loading mock test…
      </div>
    );
  }

  return (
    <MockTestRunner
      key={`${subject.id}-${testNo}-${nonce}`}
      subject={subject}
      testNo={testNo}
      pool={pool}
      storageKey={storageKey}
      onRegenerate={() => setNonce((n) => n + 1)}
    />
  );
}

function MockTestRunner({
  subject, testNo, pool, storageKey, onRegenerate,
}: {
  subject: DbSubject; testNo: number; pool: QuizQ[]; storageKey: string; onRegenerate: () => void;
}) {
  const navigate = useNavigate();
  const { state: pyqState, recordAttempt, toggleBookmark } = usePyqStore();

  const byId = useMemo(() => new Map(pool.map((q) => [q.id, q])), [pool]);

  const buildFresh = useCallback((): SavedState => {
    const picked = shuffle(pool).slice(0, TARGET);
    return {
      order: picked.map((q) => ({ id: q.id, opts: shuffle(q.options.map((_o, i) => i)) })),
      answers: {}, marked: {}, visited: { 0: true },
      idx: 0, remaining: TIME_LIMIT_SEC, startedAt: Date.now(),
    };
  }, [pool]);

  const [state, setState] = useState<SavedState>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as SavedState;
          const valid =
            Array.isArray(parsed?.order) &&
            parsed.order.length > 0 &&
            parsed.order.every((o) => byId.has(o.id));
          if (valid) return parsed;
        }
      } catch { /* ignore corrupt state */ }
    }
    return buildFresh();
  });

  const [submitted, setSubmitted] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submittedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const questions = useMemo(
    () => state.order.map((o) => byId.get(o.id)!).filter(Boolean),
    [state.order, byId],
  );
  const total = questions.length;
  const shortfall = total < TARGET;
  const idx = Math.min(state.idx, Math.max(0, total - 1));

  useEffect(() => {
    if (submitted || typeof window === "undefined") return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* quota */ }
  }, [state, storageKey, submitted]);

  const finish = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const s = stateRef.current;
    const qs = s.order.map((o) => byId.get(o.id)!).filter(Boolean);
    setSubmitted(true);
    try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
    Object.entries(s.answers).forEach(([i, sel]) => {
      const q = qs[Number(i)];
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
    let correct = 0, wrong = 0, unanswered = 0;
    qs.forEach((q, i) => {
      const sel = s.answers[i];
      if (sel == null) unanswered += 1;
      else if (sel === q.answer) correct += 1;
      else wrong += 1;
    });
    const timeTakenSeconds = Math.max(0, TIME_LIMIT_SEC - s.remaining);
    const accuracy = correct + wrong > 0 ? (correct / (correct + wrong)) * 100 : 0;
    saveAttempt({
      subjectId: subject.id, subjectName: subject.name, testNo,
      total: qs.length, correct, wrong, unanswered, score: correct,
      accuracy, timeTakenSeconds, at: Date.now(),
    });
    void saveMockTest({
      subjectId: subject.id,
      testName: `${subject.name} Full Mock Test ${testNo}`,
      score: correct,
      totalQuestions: qs.length,
      timeTakenSeconds,
    });
  }, [byId, recordAttempt, storageKey, subject.id, subject.name, testNo]);

  useEffect(() => {
    if (submitted || total === 0) return;
    const t = setInterval(() => {
      setState((prev) => {
        if (prev.remaining <= 1) {
          clearInterval(t);
          setTimeout(finish, 0);
          return { ...prev, remaining: 0 };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted, total, finish]);

  if (total === 0) {
    return (
      <div className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto max-w-md space-y-4">
          <Link to="/mock-test/$subject" params={{ subject: subject.id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
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
  const optOrder = state.order[idx].opts;

  const setAnswer = (displayed: number) => {
    if (submitted) return;
    setState((p) => ({ ...p, answers: { ...p.answers, [idx]: optOrder[displayed] } }));
  };
  const toggleMark = () =>
    setState((p) => ({ ...p, marked: { ...p.marked, [idx]: !p.marked[idx] } }));
  const goto = (i: number) => {
    setState((p) => ({ ...p, idx: i, visited: { ...p.visited, [i]: true } }));
    setShowPalette(false);
  };

  const restart = (random = false) => {
    submittedRef.current = false;
    setSubmitted(false);
    setConfirmOpen(false);
    if (random) onRegenerate();
    else setState({
      order: state.order.map((o) => ({ ...o })), answers: {}, marked: {}, visited: { 0: true },
      idx: 0, remaining: TIME_LIMIT_SEC, startedAt: Date.now(),
    });
  };

  const answeredCount = Object.keys(state.answers).length;
  const markedCount = Object.values(state.marked).filter(Boolean).length;
  const remaining = state.remaining;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (submitted) {
    return (
      <MockResults
        questions={questions}
        answers={state.answers}
        subject={subject}
        testNo={testNo}
        timeTakenSec={Math.max(0, TIME_LIMIT_SEC - remaining)}
        onRetake={() => restart(false)}
        onRandom={() => restart(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between gap-3 px-5 pt-6 pb-4">
          <button
            onClick={() => navigate({ to: "/mock-test/$subject", params: { subject: subject.id } })}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {subject.name}
            </p>
            <p className="truncate font-display text-sm font-bold">Full Mock Test {testNo}</p>
          </div>
          <button onClick={() => toggleBookmark(question.id)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card" aria-label="Bookmark question">
            {pyqState.bookmarks.includes(question.id) ? <BookmarkCheck className="h-5 w-5 text-gold" /> : <Bookmark className="h-5 w-5 text-muted-foreground" />}
          </button>
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
            <span>Q {idx + 1} of {total} · {answeredCount} answered</span>
            <button onClick={() => setShowPalette((v) => !v)} className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
              Palette
            </button>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-gradient-primary h-full rounded-full transition-all"
              style={{ width: `${(answeredCount / total) * 100}%` }} />
          </div>
        </div>

        {showPalette && (
          <div className="mx-5 mt-4 rounded-2xl border border-border bg-card p-3">
            <div className="grid grid-cols-8 gap-2">
              {questions.map((_q, i) => {
                const isAns = state.answers[i] != null;
                const isMark = state.marked[i];
                const isVisited = state.visited[i];
                const cls = i === idx
                  ? "bg-primary text-primary-foreground"
                  : isMark
                    ? "bg-amber-500/80 text-black"
                    : isAns
                      ? "bg-success/70 text-success-foreground"
                      : isVisited
                        ? "bg-primary/25 text-primary"
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
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary/25" />Visited</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-muted" />Not visited</span>
            </div>
            <button
              onClick={() => { setShowPalette(false); setConfirmOpen(true); }}
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
            {optOrder.map((originalIdx, i) => {
              const selected = state.answers[idx] === originalIdx;
              return (
                <button key={i} type="button" onClick={() => setAnswer(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    selected ? "border-primary/60 bg-primary/10" : "border-border bg-card hover:border-primary/40"
                  }`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>{String.fromCharCode(65 + i)}</div>
                  <span className="text-sm font-medium leading-snug">{question.options[originalIdx]}</span>
                </button>
              );
            })}
          </div>

          <button onClick={toggleMark}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold ${
              state.marked[idx] ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-border bg-card text-muted-foreground"
            }`}>
            <Flag className="h-4 w-4" /> {state.marked[idx] ? "Marked for review" : "Mark for review"}
          </button>
        </main>

        <div className="fixed right-0 bottom-0 left-0 mx-auto max-w-md px-5 pb-5">
          <div className="flex gap-2">
            <button onClick={() => goto(Math.max(0, idx - 1))} disabled={idx === 0}
              className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 font-display font-bold disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            {idx + 1 >= total ? (
              <button onClick={() => setConfirmOpen(true)}
                className="bg-gradient-primary shadow-glow flex flex-1 items-center justify-center gap-1 rounded-2xl py-3 font-display font-bold text-primary-foreground">
                Submit
              </button>
            ) : (
              <button onClick={() => goto(Math.min(total - 1, idx + 1))}
                className="bg-gradient-primary shadow-glow flex flex-1 items-center justify-center gap-1 rounded-2xl py-3 font-display font-bold text-primary-foreground">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-5 pb-6">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-card-premium">
              <p className="font-display text-base font-bold">Are you sure you want to submit this Mock Test?</p>
              <div className="mt-4 space-y-2 text-sm">
                <Row label="Answered" value={answeredCount} />
                <Row label="Not answered" value={total - answeredCount} />
                <Row label="Marked for review" value={markedCount} />
                <Row label="Remaining time" value={`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`} />
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setConfirmOpen(false)}
                  className="flex-1 rounded-2xl border border-border bg-card py-3 font-display font-bold">
                  Cancel
                </button>
                <button onClick={() => { setConfirmOpen(false); finish(); }}
                  className="bg-gradient-primary shadow-glow flex-1 rounded-2xl py-3 font-display font-bold text-primary-foreground">
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display font-bold tabular-nums">{value}</span>
    </div>
  );
}

function MockResults({
  questions, answers, subject, testNo, timeTakenSec, onRetake, onRandom,
}: {
  questions: QuizQ[]; answers: Record<number, number>; subject: DbSubject;
  testNo: number; timeTakenSec: number; onRetake: () => void; onRandom: () => void;
}) {
  const [practice, setPractice] = useState(false);
  const [review, setReview] = useState(false);

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
  const best = bestFor(subject.id, testNo);

  const chapters = Array.from(perChapter.values()).map((c) => ({
    ...c, pct: c.total ? Math.round((c.correct / c.total) * 100) : 0,
  }));
  const weak = chapters.filter((c) => c.pct < 50).sort((a, b) => a.pct - b.pct);
  const strong = chapters.filter((c) => c.pct >= 75).sort((a, b) => b.pct - a.pct);

  const wrongPool = questions.filter((_q, i) => {
    const sel = answers[i];
    return sel == null || sel !== questions[i].answer;
  });

  const statusOf = (i: number): ReviewFilter => {
    const sel = answers[i];
    if (sel == null) return "unanswered";
    return sel === questions[i].answer ? "correct" : "wrong";
  };
  if (practice) {
    return <WrongPractice questions={wrongPool} subjectName={subject.name} onExit={() => setPractice(false)} />;
  }
  if (review) {
    return <AnswerReview questions={questions} answers={answers} subjectName={subject.name} onExit={() => setReview(false)} />;
  }

  const completion = pct >= 90 ? { icon: "🏆", label: "Excellent" }
    : pct >= 75 ? { icon: "🥇", label: "Very Good" }
      : pct >= 60 ? { icon: "🥈", label: "Good" } : { icon: "📘", label: "Needs Improvement" };
  const shareResult = async () => {
    const text = `Eklavya Bihar Board 10th PYQ\n${subject.name} · Full Mock Test ${testNo}\nScore: ${correct}/${total}\nAccuracy: ${acc}%\nCorrect: ${correct} · Wrong: ${wrong} · Unanswered: ${unanswered}\nTime: ${mins}m ${secs}s`;
    if (navigator.share) await navigator.share({ title: "Eklavya Mock Test Result", text });
    else await navigator.clipboard?.writeText(text);
  };

  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-10 text-foreground">
      <div className="mx-auto max-w-md space-y-4">
        <div className="bg-hero relative overflow-hidden rounded-3xl border border-white/5 p-6 text-center shadow-card-premium">
          <div className="bg-gold/20 absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl" />
          <div className="relative">
            <div className="bg-gradient-gold shadow-gold mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
              <Trophy className="h-8 w-8 text-gold-foreground" />
            </div>
            <h2 className="font-display mt-4 text-2xl font-bold">{subject.name} · Mock Test {testNo}</h2>
            <p className="font-display mt-2 text-5xl font-bold text-gradient-gold">{pct}%</p>
            <p className="mt-1 text-sm text-muted-foreground">Score {correct} / {total}</p>
            <div className="mt-4 inline-flex animate-[bounce_900ms_ease-out_1] items-center gap-2 rounded-full border border-gold/30 bg-gold/15 px-4 py-2">
              <span className="text-xl">{completion.icon}</span><span className="font-display text-sm font-bold text-gold">{completion.label}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Correct" value={correct} tone="success" icon={<Check className="h-4 w-4" />} />
          <StatTile label="Wrong" value={wrong} tone="destructive" icon={<X className="h-4 w-4" />} />
          <StatTile label="Unanswered" value={unanswered} tone="muted" icon={<Flag className="h-4 w-4" />} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Total" value={total} tone="primary" icon={<ListChecks className="h-4 w-4" />} />
          <StatTile label="Accuracy" value={`${acc}%`} tone="primary" />
          <StatTile label="Time taken" value={`${mins}m ${secs}s`} tone="primary" icon={<Timer className="h-4 w-4" />} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-display text-sm font-bold">Best performance · Mock Test {testNo}</p>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Highest score" value={best.bestScore} />
            <Row label="Highest accuracy" value={`${Math.round(best.bestAccuracy)}%`} />
            <Row label="Fastest completion" value={best.fastestSeconds != null ? `${Math.floor(best.fastestSeconds / 60)}m ${best.fastestSeconds % 60}s` : "—"} />
            <Row label="Total attempts" value={best.attempts} />
            <Row label="Last attempt" value={best.lastAttemptAt ? new Date(best.lastAttemptAt).toLocaleDateString() : "—"} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-display text-sm font-bold">Chapter-wise performance</p>
          <div className="mt-3 space-y-2.5">
            {chapters.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">{c.name}</span>
                  <span className="font-bold text-foreground">{c.correct}/{c.total} · {c.pct}% correct · {100 - c.pct}% wrong</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="bg-gradient-primary h-full rounded-full" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-destructive/10 p-3">
              <p className="font-display font-bold text-destructive">Weak chapters</p>
              <p className="mt-1 text-muted-foreground">{weak.length ? weak.map((c) => c.name).join(", ") : "None — great job!"}</p>
            </div>
            <div className="rounded-xl bg-success/10 p-3">
              <p className="font-display font-bold text-success">Strong chapters</p>
              <p className="mt-1 text-muted-foreground">{strong.length ? strong.map((c) => c.name).join(", ") : "Keep practising"}</p>
            </div>
          </div>
        </div>

        <button onClick={() => setReview(true)} className="bg-gradient-primary shadow-glow flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display font-bold text-primary-foreground"><Eye className="h-5 w-5" /> Review Answers</button>

        <button onClick={() => void shareResult()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 py-4 font-display font-bold text-gold"><Share2 className="h-5 w-5" /> Share Result</button>

        <button onClick={() => setPractice(true)} disabled={wrongPool.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-display font-bold disabled:opacity-40">
          <ListChecks className="h-5 w-5" /> Retry Wrong Questions ({wrongPool.length})
        </button>

        <button onClick={onRetake}
          className="bg-gradient-primary shadow-glow flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display font-bold text-primary-foreground">
          <RotateCcw className="h-5 w-5" /> Retry Entire Mock
        </button>

        <button onClick={onRandom} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-display font-bold"><RotateCcw className="h-5 w-5" /> New Random Mock</button>

        {testNo < MOCK_TESTS_PER_SUBJECT && (
          <Link to="/mock-test/$subject/$test" params={{ subject: subject.id, test: String(testNo + 1) }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-display font-bold">
            Start Mock Test {testNo + 1} <ArrowRight className="h-5 w-5" />
          </Link>
        )}

        <Link to="/mock-test/$subject" params={{ subject: subject.id }}
          className="block w-full rounded-2xl border border-border bg-card py-4 text-center font-display font-bold">
          Back to {subject.name}
        </Link>
      </div>
    </div>
  );
}

function AnswerReview({ questions, answers, subjectName, onExit }: {
  questions: QuizQ[]; answers: Record<number, number>; subjectName: string; onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [palette, setPalette] = useState(false);
  const { state, toggleBookmark } = usePyqStore();
  const q = questions[index];
  if (!q) return null;
  const selected = answers[index];
  const status = selected == null ? "Not attempted" : selected === q.answer ? "Correct" : "Wrong";
  return (
    <div className="min-h-screen bg-background pb-28 text-foreground"><div className="mx-auto max-w-md">
      <header className="flex items-center justify-between gap-2 px-5 pt-6 pb-4">
        <button onClick={onExit} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card" aria-label="Back to result"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 text-center"><p className="truncate text-[10px] text-muted-foreground">{subjectName} · ANSWER REVIEW</p><p className="font-display text-sm font-bold">Question {index + 1} of {questions.length}</p></div>
        <button onClick={() => toggleBookmark(q.id)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card" aria-label="Bookmark question">{state.bookmarks.includes(q.id) ? <BookmarkCheck className="h-5 w-5 text-gold" /> : <Bookmark className="h-5 w-5 text-muted-foreground" />}</button>
      </header>
      <div className="px-5"><div className="flex items-center justify-between text-[11px]"><span className={status === "Correct" ? "text-success" : status === "Wrong" ? "text-destructive" : "text-muted-foreground"}>{status}</span><button onClick={() => setPalette((v) => !v)} className="rounded-full bg-primary/15 px-3 py-1 font-bold text-primary">Question Palette</button></div></div>
      {palette && <div className="mx-5 mt-3 rounded-2xl border border-border bg-card p-3"><div className="grid grid-cols-8 gap-2">{questions.map((question, i) => { const answer = answers[i]; const cls = i === index ? "ring-2 ring-primary" : ""; const tone = answer == null ? "bg-muted text-muted-foreground" : answer === question.answer ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"; return <button key={question.id} onClick={() => { setIndex(i); setPalette(false); }} className={`h-8 rounded-lg text-[11px] font-bold ${tone} ${cls}`}>{i + 1}</button>; })}</div><div className="mt-3 flex gap-3 text-[10px] text-muted-foreground"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />Correct</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-destructive" />Wrong</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-muted" />Not attempted</span></div></div>}
      <main className="mt-5 space-y-4 px-5">
        <div className="bg-gradient-card rounded-3xl border border-border p-5"><p className="text-[10px] text-muted-foreground">{q.chapterName}</p><p className="font-display mt-2 font-semibold leading-relaxed">{q.text}</p></div>
        <div className="space-y-2.5">{q.options.map((option, i) => { const isCorrect = i === q.answer; const isWrong = selected === i && selected !== q.answer; const cls = isCorrect ? "border-success/60 bg-success/15" : isWrong ? "border-destructive/60 bg-destructive/15" : "border-border bg-card opacity-70"; return <div key={i} className={`flex items-center gap-3 rounded-2xl border p-4 ${cls}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold ${isCorrect ? "bg-success text-success-foreground" : isWrong ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>{isCorrect ? <Check className="h-4 w-4" /> : isWrong ? <X className="h-4 w-4" /> : String.fromCharCode(65 + i)}</span><span className="text-sm">{option}</span></div>; })}</div>
        {q.explanation?.trim() && <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-bold text-muted-foreground">EXPLANATION</p><p className="mt-2 text-xs leading-relaxed">{q.explanation}</p></div>}
      </main>
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md px-5 pb-5"><div className="flex gap-2"><button disabled={index === 0} onClick={() => setIndex(index - 1)} className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 font-bold disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><button disabled={index + 1 >= questions.length} onClick={() => setIndex(index + 1)} className="bg-gradient-primary flex flex-1 items-center justify-center gap-1 rounded-2xl py-3 font-bold text-primary-foreground disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button></div></div>
    </div></div>
  );
}

function WrongPractice({
  questions, subjectName, onExit,
}: { questions: QuizQ[]; subjectName: string; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = questions[i];

  if (!q) {
    return (
      <div className="min-h-screen bg-background px-5 pt-6 text-foreground">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-display font-bold">Nothing to practise</p>
          <button onClick={onExit} className="mt-4 w-full rounded-2xl border border-border py-3 font-display font-bold">Back to result</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-10 text-foreground">
      <div className="mx-auto max-w-md space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={onExit} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card" aria-label="Back to result">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{subjectName}</p>
            <p className="font-display text-sm font-bold">Practice · {i + 1} of {questions.length}</p>
          </div>
          <div className="w-10" />
        </header>

        <div className="bg-gradient-card rounded-3xl border border-border p-5 shadow-card-premium">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{q.chapterName}</p>
          <p className="font-display mt-1 text-base font-semibold leading-relaxed">{q.text}</p>
        </div>

        <div className="space-y-2.5">
          {q.options.map((opt, oi) => {
            const revealed = picked != null;
            const isCorrect = oi === q.answer;
            const cls = !revealed
              ? "border-border bg-card hover:border-primary/40"
              : isCorrect
                ? "border-success/60 bg-success/10"
                : oi === picked ? "border-destructive/60 bg-destructive/10" : "border-border bg-card opacity-60";
            return (
              <button key={oi} type="button" disabled={revealed} onClick={() => setPicked(oi)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${cls}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted font-display text-sm font-bold text-muted-foreground">
                  {String.fromCharCode(65 + oi)}
                </div>
                <span className="text-sm font-medium leading-snug">{opt}</span>
              </button>
            );
          })}
        </div>

        {picked != null && q.explanation?.trim() ? (
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Explanation</p>
            <p className="mt-1 text-[11px] leading-relaxed">{q.explanation}</p>
          </div>
        ) : null}

        <div className="flex gap-2">
          <button onClick={() => { setI(Math.max(0, i - 1)); setPicked(null); }} disabled={i === 0}
            className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 font-display font-bold disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          {i + 1 < questions.length ? (
            <button onClick={() => { setI(i + 1); setPicked(null); }}
              className="bg-gradient-primary shadow-glow flex flex-1 items-center justify-center gap-1 rounded-2xl py-3 font-display font-bold text-primary-foreground">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={onExit}
              className="bg-gradient-primary shadow-glow flex flex-1 items-center justify-center gap-1 rounded-2xl py-3 font-display font-bold text-primary-foreground">
              Finish
            </button>
          )}
        </div>
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
