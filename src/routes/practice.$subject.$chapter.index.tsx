import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, CheckCircle2, Trophy, ListChecks, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { buildPracticeSets, readSetBestScores, type Question } from "@/lib/pyq/data";
import {
  fetchSubjectById, fetchChapterById, fetchChapterQuestions,
  type DbSubject, type DbChapter,
} from "@/lib/pyq/db";
import { usePyqStore } from "@/lib/pyq/store";

export const Route = createFileRoute("/practice/$subject/$chapter/")({
  loader: async ({ params }) => {
    const subject = await fetchSubjectById(params.subject);
    if (!subject) throw notFound();
    const chapter = await fetchChapterById(subject.id, params.chapter);
    if (!chapter) throw notFound();
    const questions = await fetchChapterQuestions(chapter.id);
    return { subject, chapter, questions };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.chapter.name ?? "Practice"} Sets · Eklavya` },
      { name: "description", content: `Practice sets from ${loaderData?.chapter.name ?? ""}.` },
    ],
  }),
  errorComponent: () => <div className="p-6 text-center">Something went wrong.</div>,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
      <div>
        <p className="font-display text-lg font-bold">Chapter not found</p>
        <Link to="/practice" className="mt-3 inline-block text-primary text-sm">← Back to subjects</Link>
      </div>
    </div>
  ),
  component: ChapterSetsPage,
});

function ChapterSetsPage() {
  const { subject, chapter, questions } = Route.useLoaderData() as {
    subject: DbSubject; chapter: DbChapter; questions: Question[];
  };
  const { state } = usePyqStore();
  const [best, setBest] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = () => setBest(readSetBestScores());
    load();
    window.addEventListener("eklavya:pyq:update", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("eklavya:pyq:update", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const sets = buildPracticeSets(questions);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link
            to="/practice/$subject"
             params={{ subject: subject.id }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {subject.name}
            </p>
            <p className="truncate font-display text-sm font-bold">{chapter.name}</p>
          </div>
          <div className="w-10" />
        </header>

        <main className="space-y-4 px-5">
          <div className="bg-gradient-card flex items-center gap-3 rounded-2xl border border-border p-4">
            <div className="bg-primary/15 flex h-10 w-10 items-center justify-center rounded-xl">
              <ListChecks className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold">Practice Sets</p>
              <p className="text-[11px] text-muted-foreground">
                {sets.length} set{sets.length === 1 ? "" : "s"} · auto-generated
              </p>
            </div>
          </div>

          {sets.length === 0 ? (
            <EmptyState />
          ) : (
            sets.map((qs: Question[], i: number) => {
              const attempted = qs.filter((q) => state.attempts[q.id]).length;
              const correct = qs.filter((q) => state.attempts[q.id]?.correct).length;
              const setKey = `${subject.id}:${chapter.id}:${i + 1}`;
              const bestPct = best[setKey];
              return (
                <Link
                  key={setKey}
                  to="/practice/$subject/$chapter/$set"
                   params={{ subject: subject.id, chapter: chapter.id, set: String(i + 1) }}
                  className="bg-gradient-card block rounded-2xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`bg-gradient-to-br ${subject.hue} flex h-12 w-12 items-center justify-center rounded-2xl font-display text-base font-bold text-white shadow-lg`}>
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold">Set {i + 1}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {qs.length} questions · {attempted} attempted
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {attempted > 0 && (
                        <div className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1">
                          <CheckCircle2 className="h-3 w-3 text-success" />
                          <span className="text-[11px] font-bold text-success">{correct}/{attempted}</span>
                        </div>
                      )}
                      {bestPct != null && (
                        <div className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5">
                          <Trophy className="h-3 w-3 text-amber-300" />
                          <span className="text-[10px] font-bold text-amber-300">Best {bestPct}%</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`bg-gradient-to-r ${subject.hue} h-full rounded-full transition-all`}
                      style={{ width: `${qs.length ? Math.round((attempted / qs.length) * 100) : 0}%` }}
                    />
                  </div>
                </Link>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
      <p className="font-display text-sm font-bold">No questions yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Questions for this chapter will appear here once added.
      </p>
    </div>
  );
}
