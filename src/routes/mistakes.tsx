import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, NotebookPen, X } from "lucide-react";
import { SUBJECTS, type Question } from "@/lib/pyq/data";
import { usePyqStore } from "@/lib/pyq/store";

export const Route = createFileRoute("/mistakes")({
  head: () => ({
    meta: [
      { title: "Mistake Notebook · Eklavya" },
      { name: "description", content: "Every wrong answer auto-saved here. Learn from your mistakes." },
    ],
  }),
  component: MistakesPage,
});

type Item = { q: Question; subjectName: string; chapterName: string; selected: number };

function MistakesPage() {
  const { state } = usePyqStore();
  const items: Item[] = [];
  for (const s of SUBJECTS) {
    for (const c of s.chapters) {
      for (const q of c.questions) {
        if (state.mistakes.includes(q.id)) {
          items.push({
            q,
            subjectName: s.name,
            chapterName: c.name,
            selected: state.attempts[q.id]?.selected ?? -1,
          });
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/practice" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">Mistake Notebook</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-3 px-5">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-border bg-gradient-card p-8 text-center">
              <NotebookPen className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-display font-bold">No mistakes yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Wrong answers are auto-saved here so you can revise them.
              </p>
            </div>
          ) : (
            items.map(({ q, subjectName, chapterName, selected }) => (
              <div key={q.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                <p className="text-[11px] font-semibold tracking-wider text-rose-300 uppercase">
                  {subjectName} · {chapterName}
                </p>
                <p className="mt-2 text-sm font-medium leading-snug">{q.text}</p>
                {selected >= 0 && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs">
                    <X className="h-3.5 w-3.5 text-destructive" />
                    <span><span className="font-bold text-destructive">Your answer: </span>{q.options[selected]}</span>
                  </p>
                )}
                <p className="mt-2 rounded-xl bg-success/10 px-3 py-2 text-xs">
                  <span className="font-bold text-success">Correct: </span>
                  {q.options[q.answer]}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{q.explanation}</p>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
