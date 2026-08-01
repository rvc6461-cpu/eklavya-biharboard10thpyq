import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Bookmark, BookmarkCheck, Check, X, ChevronRight,
  RotateCcw, Trophy, Lightbulb, Shuffle,
} from "lucide-react";
import { buildPracticeSets, writeSetBestScore, type Question } from "@/lib/pyq/data";
import { fetchSubjectById, fetchChapterById, fetchChapterQuestions } from "@/lib/pyq/db";
import { usePyqStore } from "@/lib/pyq/store";

export const Route = createFileRoute("/practice/$subject/$chapter/$set")({
  loader: async ({ params }) => {
    const subject = await fetchSubjectById(params.subject);
    if (!subject) throw notFound();
    const chapter = await fetchChapterById(subject.id, params.chapter);
    if (!chapter) throw notFound();
    const questions = await fetchChapterQuestions(chapter.id);
    const sets = buildPracticeSets(questions);
    const setIndex = Number(params.set) - 1;
    if (!Number.isInteger(setIndex) || setIndex < 0 || setIndex >= sets.length) throw notFound();
    return { subject, chapter, questions: sets[setIndex], setNumber: setIndex + 1, totalSets: sets.length };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.chapter.name ?? "Practice"} · Set ${loaderData?.setNumber ?? ""} · Eklavya` },
      { name: "description", content: `Practice set from ${loaderData?.chapter.name ?? ""}.` },
    ],
  }),
  errorComponent: () => <div className="p-6 text-center">Something went wrong.</div>,
  notFoundComponent: () => <div className="p-6 text-center">Set not found.</div>,
  component: PracticeSetSession,
});

function PracticeSetSession() {
  const { subject, chapter, questions, setNumber } = Route.useLoaderData();
  const navigate = useNavigate();
  const { state, recordAttempt, toggleBookmark } = usePyqStore();

  const [shuffle, setShuffle] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const order = useMemo(() => {
    const arr = questions.map((_: Question, i: number) => i);
    if (!shuffle) return arr;
    let s = shuffleSeed || 1;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [questions, shuffle, shuffleSeed]);

  const total = order.length;
  const question = questions[order[idx]];
  const bestKey = `${subject.id}:${chapter.id}:${setNumber}`;

  useEffect(() => {
    if (done) {
      const pct = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
      writeSetBestScore(bestKey, pct);
    }
  }, [done, sessionCorrect, total, bestKey]);

  const resetSession = (reshuffle = false) => {
    setIdx(0); setSelected(null); setRevealed(false);
    setSessionCorrect(0); setDone(false);
    if (reshuffle && shuffle) setShuffleSeed(Date.now());
  };

  if (done) {
    return (
      <SessionSummary
        correct={sessionCorrect}
        total={total}
        onRetry={() => resetSession(true)}
        backHref={`/practice/${subject.id}/${chapter.id}`}
      />
    );
  }

  const choose = (i: number) => {
    if (revealed) return;
    setSelected(i);
    const correct = i === question.answer;
    if (correct) setSessionCorrect((c) => c + 1);
    setRevealed(true);
    recordAttempt({
      questionId: question.id,
      subjectId: subject.id,
      chapterId: chapter.id,
      selected: i,
      correct,
      at: Date.now(),
    });
  };

  const next = () => {
    if (idx + 1 >= total) { setDone(true); return; }
    setIdx(idx + 1); setSelected(null); setRevealed(false);
  };

  const toggleShuffle = () => {
    const nextOn = !shuffle;
    setShuffle(nextOn);
    setShuffleSeed(nextOn ? Date.now() : 0);
    setIdx(0); setSelected(null); setRevealed(false); setSessionCorrect(0);
  };

  const isBookmarked = state.bookmarks.includes(question.id);

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between gap-3 px-5 pt-6 pb-4">
          <button
            onClick={() => navigate({ to: "/practice/$subject/$chapter", params: { subject: subject.id, chapter: chapter.id } })}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {chapter.name}
            </p>
            <p className="truncate font-display text-sm font-bold">Set {setNumber}</p>
          </div>
          <button
            onClick={toggleShuffle}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
              shuffle ? "border-primary/60 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"
            }`}
            aria-label="Shuffle questions"
            aria-pressed={shuffle}
          >
            <Shuffle className="h-5 w-5" />
          </button>
          <button
            onClick={() => toggleBookmark(question.id)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
            aria-label="Bookmark"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 text-gold" />
            ) : (
              <Bookmark className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </header>

        <div className="px-5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span>Question {idx + 1} of {total}</span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">PYQ {question.year}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-gradient-primary h-full rounded-full transition-all"
              style={{ width: `${((idx + (revealed ? 1 : 0)) / total) * 100}%` }}
            />
          </div>
        </div>

        <main className="mt-5 space-y-5 px-5">
          <div className="bg-gradient-card rounded-3xl border border-border p-5 shadow-card-premium">
            <p className="font-display text-base leading-relaxed font-semibold">
              {question.text}
            </p>
          </div>

          <div className="space-y-2.5">
            {question.options.map((opt: string, i: number) => (
              <OptionButton
                key={i}
                index={i}
                text={opt}
                selected={selected === i}
                revealed={revealed}
                correctIndex={question.answer}
                onClick={() => choose(i)}
              />
            ))}
          </div>

          {revealed && (
            <div className={`rounded-2xl border p-4 ${
              selected === question.answer
                ? "border-success/30 bg-success/10"
                : "border-destructive/30 bg-destructive/10"
            }`}>
              <div className="flex items-center gap-2">
                {selected === question.answer ? (
                  <><Check className="h-4 w-4 text-success" /><p className="font-bold text-success">Correct!</p></>
                ) : (
                  <><X className="h-4 w-4 text-destructive" /><p className="font-bold text-destructive">Saved to Mistake Book</p></>
                )}
              </div>
              <div className="mt-2 flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <p className="text-xs leading-relaxed text-muted-foreground">{question.explanation}</p>
              </div>
            </div>
          )}
        </main>

        {revealed && (
          <div className="fixed right-0 bottom-0 left-0 mx-auto max-w-md px-5 pb-5">
            <button
              onClick={next}
              className="bg-gradient-primary shadow-glow flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display font-bold text-primary-foreground"
            >
              {idx + 1 >= total ? "Finish" : "Next question"}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionButton({
  index, text, selected, revealed, correctIndex, onClick,
}: {
  index: number; text: string; selected: boolean; revealed: boolean;
  correctIndex: number; onClick: () => void;
}) {
  const isCorrect = index === correctIndex;
  const showCorrect = revealed && isCorrect;
  const showWrong = revealed && selected && !isCorrect;

  const base = "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition";
  const cls = showCorrect
    ? "border-success/50 bg-success/15"
    : showWrong
      ? "border-destructive/50 bg-destructive/15"
      : selected
        ? "border-primary/60 bg-primary/10"
        : "border-border bg-card hover:border-primary/40";

  return (
    <button type="button" onClick={onClick} disabled={revealed} className={`${base} ${cls}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
        showCorrect
          ? "bg-success text-success-foreground"
          : showWrong
            ? "bg-destructive text-destructive-foreground"
            : selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
      }`}>
        {showCorrect ? <Check className="h-4 w-4" /> : showWrong ? <X className="h-4 w-4" /> : String.fromCharCode(65 + index)}
      </div>
      <span className="text-sm font-medium leading-snug">{text}</span>
    </button>
  );
}

function SessionSummary({
  correct, total, onRetry, backHref,
}: { correct: number; total: number; onRetry: () => void; backHref: string }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="min-h-screen bg-background px-5 pt-10 pb-10 text-foreground">
      <div className="mx-auto max-w-md space-y-5">
        <div className="bg-hero relative overflow-hidden rounded-3xl border border-white/5 p-6 text-center shadow-card-premium">
          <div className="bg-gold/20 absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl" />
          <div className="relative">
            <div className="bg-gradient-gold shadow-gold mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
              <Trophy className="h-8 w-8 text-gold-foreground" />
            </div>
            <h2 className="font-display mt-4 text-2xl font-bold">Set complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">You scored</p>
            <p className="font-display mt-2 text-5xl font-bold text-gradient-gold">{pct}%</p>
            <p className="mt-1 text-sm text-muted-foreground">{correct} of {total} correct</p>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="bg-gradient-primary shadow-glow flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display font-bold text-primary-foreground"
        >
          <RotateCcw className="h-5 w-5" /> Retry set
        </button>
        <Link to={backHref} className="block rounded-2xl border border-border bg-card py-4 text-center font-display font-bold">
          Back to sets
        </Link>
      </div>
    </div>
  );
}
