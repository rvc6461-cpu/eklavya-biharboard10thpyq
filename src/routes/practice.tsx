import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Bookmark, NotebookPen, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePyqStore } from "@/lib/pyq/store";
import { fetchSubjects, type DbSubject } from "@/lib/pyq/db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "PYQ Practice · Eklavya" },
      { name: "description", content: "Chapter-wise previous year questions for Bihar Board Class 10. Practice offline, anytime." },
    ],
  }),
  component: PracticeIndex,
});

function PracticeIndex() {
  const { state } = usePyqStore();
  const [subjects, setSubjects] = useState<DbSubject[] | null>(null);
  const [counts, setCounts] = useState<Record<string, { chapters: number; questions: number }>>({});

  useEffect(() => {
    (async () => {
      const subs = await fetchSubjects();
      setSubjects(subs);
      if (!subs.length) { setCounts({}); return; }
      const ids = subs.map((s) => s.id);
      const [{ data: chaps }, { data: qs }] = await Promise.all([
        supabase.from("chapters").select("id,subject_id").in("subject_id", ids).eq("is_active", true),
        supabase.from("questions").select("id,subject_id").in("subject_id", ids).eq("status", "published"),
      ]);
      const map: Record<string, { chapters: number; questions: number }> = {};
      for (const s of subs) map[s.id] = { chapters: 0, questions: 0 };
      for (const c of chaps ?? []) map[c.subject_id] && map[c.subject_id].chapters++;
      for (const q of qs ?? []) map[q.subject_id] && map[q.subject_id].questions++;
      setCounts(map);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">PYQ Practice</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-6 px-5">
          <div className="bg-hero relative overflow-hidden rounded-3xl border border-white/5 p-5 shadow-card-premium">
            <div className="bg-primary/30 absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <BookOpen className="h-3 w-3 text-gold" />
                <span className="text-[11px] font-semibold tracking-wide">Offline · Chapter-wise</span>
              </div>
              <h2 className="font-display mt-3 text-xl font-bold leading-tight">
                Practice every PYQ.<br />
                <span className="text-gradient-gold">Beat the exam.</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/bookmarks" className="bg-gradient-card rounded-2xl border border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                <Bookmark className="h-5 w-5 text-amber-300" />
              </div>
              <p className="mt-3 font-display text-sm font-bold">Bookmarks</p>
              <p className="text-[11px] text-muted-foreground">{state.bookmarks.length} saved</p>
            </Link>
            <Link to="/mistakes" className="bg-gradient-card rounded-2xl border border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15">
                <NotebookPen className="h-5 w-5 text-rose-300" />
              </div>
              <p className="mt-3 font-display text-sm font-bold">Mistake Book</p>
              <p className="text-[11px] text-muted-foreground">{state.mistakes.length} to revise</p>
            </Link>
          </div>

          <div className="space-y-3">
            <h3 className="font-display text-base font-bold">Subjects</h3>
            {subjects === null ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : subjects.length === 0 ? (
              <EmptyState
                title="No subjects yet"
                message="Once an admin adds subjects, they'll appear here for practice."
              />
            ) : (
              subjects.map((s) => {
                const c = counts[s.id] ?? { chapters: 0, questions: 0 };
                return (
                  <Link
                    key={s.id}
                    to="/practice/$subject"
                    params={{ subject: s.slug }}
                    className="bg-gradient-card flex items-center gap-4 rounded-2xl border border-border p-4"
                  >
                    <div className={`bg-gradient-to-br ${s.hue} flex h-12 w-12 items-center justify-center rounded-2xl font-display text-xl font-bold text-white shadow-lg`}>
                      {s.glyph}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.chapters} chapters · {c.questions} questions
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
      <p className="font-display text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
