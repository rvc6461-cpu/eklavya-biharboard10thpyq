import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Trophy, Timer, History } from "lucide-react";
import { fetchSubjectById, fetchSubjectQuestionCount, type DbSubject } from "@/lib/pyq/db";
import {
  MOCK_TESTS_PER_SUBJECT, MOCK_TARGET, bestFor, listAttempts,
  type MockAttempt, type MockBest,
} from "@/lib/pyq/mockStore";

export const Route = createFileRoute("/mock-test/$subject/")({
  head: () => ({
    meta: [
      { title: "Full Mock Tests · Eklavya" },
      { name: "description", content: "Ten full-length 100-question mock tests per subject with results and analytics." },
    ],
  }),
  errorComponent: () => <div className="p-6 text-center">Something went wrong.</div>,
  notFoundComponent: () => <div className="p-6 text-center">Subject not found.</div>,
  component: SubjectMockList,
});

function fmtTime(sec: number) {
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function SubjectMockList() {
  const { subject: subjectId } = Route.useParams();
  const [subject, setSubject] = useState<DbSubject | null>(null);
  const [count, setCount] = useState(0);
  const [bests, setBests] = useState<Record<number, MockBest>>({});
  const [history, setHistory] = useState<MockAttempt[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [subj, total] = await Promise.all([
        fetchSubjectById(subjectId),
        fetchSubjectQuestionCount(subjectId),
      ]);
      if (cancelled) return;
      setSubject(subj);
      setCount(total);
    })();
    const map: Record<number, MockBest> = {};
    for (let n = 1; n <= MOCK_TESTS_PER_SUBJECT; n++) map[n] = bestFor(subjectId, n);
    setBests(map);
    setHistory(listAttempts(subjectId));
    return () => { cancelled = true; };
  }, [subjectId]);

  const perTest = Math.min(MOCK_TARGET, count);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/mock-test" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">{subject?.name ?? "Mock Tests"}</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-5 px-5">
          <div className="space-y-3">
            {Array.from({ length: MOCK_TESTS_PER_SUBJECT }, (_v, i) => i + 1).map((n) => {
              const b = bests[n];
              return (
                <Link
                  key={n}
                  to="/mock-test/$subject/$test"
                  params={{ subject: subjectId, test: String(n) }}
                  className="bg-gradient-card block rounded-2xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-primary flex h-11 w-11 items-center justify-center rounded-2xl font-display text-sm font-bold text-primary-foreground">
                      {n}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold">Full Mock Test {n}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {perTest} questions · 120 minutes
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {b && b.attempts > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
                      <Mini label="Best" value={b.bestScore} />
                      <Mini label="Accuracy" value={`${Math.round(b.bestAccuracy)}%`} />
                      <Mini label="Fastest" value={b.fastestSeconds != null ? fmtTime(b.fastestSeconds) : "—"} />
                      <Mini label="Attempts" value={b.attempts} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-display flex items-center gap-2 text-sm font-bold">
              <History className="h-4 w-4 text-muted-foreground" /> Attempt history
            </p>
            {history.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">No attempts yet. Start your first mock test.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      Mock Test {h.testNo} · Attempt {history.filter((x) => x.testNo === h.testNo && x.at <= h.at).length}
                    </span>
                    <span className="font-display font-bold tabular-nums">
                      {h.score}/{h.total} · {Math.round(h.accuracy)}% · {fmtTime(h.timeTakenSeconds)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-[11px] text-muted-foreground">
            <Trophy className="h-4 w-4 text-gold" />
            Best score, accuracy and fastest time are tracked separately for every mock test.
            <Timer className="h-4 w-4" />
          </div>
        </main>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-display text-xs font-bold tabular-nums">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
