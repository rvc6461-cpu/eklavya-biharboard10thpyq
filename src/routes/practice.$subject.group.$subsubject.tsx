import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchSubjectBySlugOrId, fetchSubSubjectBySlugOrId, fetchChaptersBySubSubject,
  type DbSubject, type DbSubSubject, type DbChapter,
} from "@/lib/pyq/db";
import { supabase } from "@/integrations/supabase/client";
import { usePyqStore } from "@/lib/pyq/store";

export const Route = createFileRoute("/practice/$subject/group/$subsubject")({
  loader: async ({ params }) => {
    const subject = await fetchSubjectBySlugOrId(params.subject);
    if (!subject) throw notFound();
    const subSubject = await fetchSubSubjectBySlugOrId(subject.id, params.subsubject);
    if (!subSubject) throw notFound();
    return { subject, subSubject };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.subSubject.name ?? "Sub subject"} · Practice · Eklavya` },
      { name: "description", content: `Chapters under ${loaderData?.subSubject.name ?? ""}.` },
    ],
  }),
  errorComponent: () => <div className="p-6 text-center">Something went wrong.</div>,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
      <div>
        <p className="font-display text-lg font-bold">Sub subject not found</p>
        <Link to="/practice" className="mt-3 inline-block text-primary text-sm">← Back to subjects</Link>
      </div>
    </div>
  ),
  component: SubSubjectPage,
});

function SubSubjectPage() {
  const { subject, subSubject } = Route.useLoaderData() as { subject: DbSubject; subSubject: DbSubSubject };
  const { state } = usePyqStore();
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<DbChapter[]>([]);
  const [qCount, setQCount] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const chs = await fetchChaptersBySubSubject(subSubject.id);
      setChapters(chs);
      const chIds = chs.map((c) => c.id);
      const { data: qs } = chIds.length
        ? await supabase.from("questions").select("id,chapter_id").in("chapter_id", chIds).eq("status", "published")
        : { data: [] as any[] };
      const map: Record<string, number> = {};
      for (const q of qs ?? []) map[q.chapter_id] = (map[q.chapter_id] ?? 0) + 1;
      setQCount(map);
      setLoading(false);
    })();
  }, [subSubject.id]);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/practice/$subject" params={{ subject: subject.slug }} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{subject.name}</p>
            <p className="truncate font-display text-sm font-bold">{subSubject.name}</p>
          </div>
          <div className="w-10" />
        </header>

        <main className="space-y-3 px-5">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : chapters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <p className="font-display text-sm font-bold">No chapters yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Chapters for this sub subject will appear here once added.</p>
            </div>
          ) : (
            chapters.map((ch) => {
              const total = qCount[ch.id] ?? 0;
              const attempted = Object.values(state.attempts).filter((a: any) => a.chapterId === ch.id).length;
              const pct = total ? Math.round((Math.min(attempted, total) / total) * 100) : 0;
              return (
                <Link
                  key={ch.id}
                  to="/practice/$subject/$chapter"
                  params={{ subject: subject.slug, chapter: ch.slug }}
                  className="bg-gradient-card block rounded-2xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold">{ch.name}</p>
                      <p className="text-[11px] text-muted-foreground">{total} PYQs · {attempted} attempted</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`bg-gradient-to-r ${subject.hue} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
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
