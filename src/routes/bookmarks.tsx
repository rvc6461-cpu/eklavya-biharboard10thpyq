import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookmarkCheck, Bookmark } from "lucide-react";
import { SUBJECTS, type Question } from "@/lib/pyq/data";
import { usePyqStore } from "@/lib/pyq/store";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({
    meta: [
      { title: "Bookmarks · Eklavya" },
      { name: "description", content: "Your saved PYQ bookmarks for quick revision." },
    ],
  }),
  component: BookmarksPage,
});

type Item = { q: Question; subjectId: string; chapterId: string; subjectName: string; chapterName: string };

function lookup(ids: string[]): Item[] {
  const out: Item[] = [];
  for (const s of SUBJECTS) {
    for (const c of s.chapters) {
      for (const q of c.questions) {
        if (ids.includes(q.id))
          out.push({ q, subjectId: s.id, chapterId: c.id, subjectName: s.name, chapterName: c.name });
      }
    }
  }
  return out;
}

function BookmarksPage() {
  const { state, toggleBookmark } = usePyqStore();
  const items = lookup(state.bookmarks);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/practice" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">Bookmarks</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-3 px-5">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-border bg-gradient-card p-8 text-center">
              <Bookmark className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-display font-bold">No bookmarks yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap the bookmark icon on any question to save it here.
              </p>
            </div>
          ) : (
            items.map(({ q, subjectName, chapterName }) => (
              <div key={q.id} className="bg-gradient-card rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {subjectName} · {chapterName}
                  </p>
                  <button
                    onClick={() => toggleBookmark(q.id)}
                    aria-label="Remove bookmark"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15"
                  >
                    <BookmarkCheck className="h-4 w-4 text-gold" />
                  </button>
                </div>
                <p className="mt-2 text-sm font-medium leading-snug">{q.text}</p>
                <p className="mt-3 rounded-xl bg-success/10 px-3 py-2 text-xs">
                  <span className="font-bold text-success">Ans: </span>
                  {q.options[q.answer]}
                </p>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
