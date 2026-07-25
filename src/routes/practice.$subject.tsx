import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Loader2, FolderTree } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchSubjectBySlugOrId, fetchSubSubjects, fetchChaptersBySubject,
  type DbSubject, type DbSubSubject, type DbChapter,
} from "@/lib/pyq/db";
import { supabase } from "@/integrations/supabase/client";
import { usePyqStore } from "@/lib/pyq/store";

export const Route = createFileRoute("/practice/$subject")({
  loader: async ({ params }) => {
    const subject = await fetchSubjectBySlugOrId(params.subject);
    if (!subject) throw notFound();
    return { subject };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.subject.name ?? "Subject"} · Practice · Eklavya` },
      { name: "description", content: `Practice previous year questions for ${loaderData?.subject.name ?? ""}.` },
    ],
  }),
  errorComponent: () => <div className="p-6 text-center">Something went wrong.</div>,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
      <div>
        <p className="font-display text-lg font-bold">Subject not found</p>
        <Link to="/practice" className="mt-3 inline-block text-primary text-sm">← Back to subjects</Link>
      </div>
    </div>
  ),
  component: SubjectPage,
});

function SubjectPage() {
  const { subject } = Route.useLoaderData() as { subject: DbSubject };
  const { state } = usePyqStore();
  const [loading, setLoading] = useState(true);
  const [subSubjects, setSubSubjects] = useState<DbSubSubject[]>([]);
  const [chapters, setChapters] = useState<DbChapter[]>([]);
  const [qCountByCh, setQCountByCh] = useState<Record<string, number>>({});
  const [qCountBySs, setQCountBySs] = useState<Record<string, number>>({});
  const [chCountBySs, setChCountBySs] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ss, chs] = await Promise.all([
        fetchSubSubjects(subject.id),
        fetchChaptersBySubject(subject.id),
      ]);
      setSubSubjects(ss);
      setChapters(chs);
      const chIds = chs.map((c) => c.id);
      const { data: qs } = chIds.length
        ? await supabase.from("questions").select("id,chapter_id").in("chapter_id", chIds).eq("status", "published")
        : { data: [] as any[] };
      const perCh: Record<string, number> = {};
      for (const q of qs ?? []) perCh[q.chapter_id] = (perCh[q.chapter_id] ?? 0) + 1;
      setQCountByCh(perCh);
      const perSs: Record<string, number> = {};
      const chPerSs: Record<string, number> = {};
      for (const c of chs) {
        if (c.sub_subject_id) {
          chPerSs[c.sub_subject_id] = (chPerSs[c.sub_subject_id] ?? 0) + 1;
          perSs[c.sub_subject_id] = (perSs[c.sub_subject_id] ?? 0) + (perCh[c.id] ?? 0);
        }
      }
      setChCountBySs(chPerSs);
      setQCountBySs(perSs);
      setLoading(false);
    })();
  }, [subject.id]);

  const orphanChapters = chapters.filter((c) => !c.sub_subject_id);
  const hasSubSubjects = subSubjects.length > 0;

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/practice" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">{subject.name}</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-3 px-5">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : hasSubSubjects || orphanChapters.length === 0 ? (
            <>
              {hasSubSubjects && (
                <>
                  <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">Sub Subjects</h3>
                  {subSubjects.map((ss) => (
                    <Link
                      key={ss.id}
                      to="/practice/$subject/$subsubject"
                      params={{ subject: subject.slug, subsubject: ss.slug }}
                      className="bg-gradient-card block rounded-2xl border border-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`bg-gradient-to-br ${subject.hue} flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg`}>
                          <FolderTree className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-bold">{ss.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {chCountBySs[ss.id] ?? 0} chapters · {qCountBySs[ss.id] ?? 0} questions
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </>
              )}
              {hasSubSubjects && orphanChapters.length > 0 && (
                <h3 className="mt-4 font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">Chapters</h3>
              )}
              {orphanChapters.map((ch) => (
                <ChapterCard key={ch.id} subject={subject} chapter={ch} total={qCountByCh[ch.id] ?? 0} attemptedMap={state.attempts} />
              ))}
              {!hasSubSubjects && orphanChapters.length === 0 && (
                <EmptyState title="Nothing here yet" message="No sub subjects or chapters added yet for this subject." />
              )}
            </>
          ) : (
            orphanChapters.map((ch) => (
              <ChapterCard key={ch.id} subject={subject} chapter={ch} total={qCountByCh[ch.id] ?? 0} attemptedMap={state.attempts} />
            ))
          )}
        </main>
      </div>
    </div>
  );
}

function ChapterCard({ subject, chapter, total, attemptedMap }: { subject: DbSubject; chapter: DbChapter; total: number; attemptedMap: Record<string, any> }) {
  // Attempted counting for questions we don't know IDs of upfront — approximate 0 for list.
  const attempted = Object.values(attemptedMap).filter((a: any) => a.chapterId === chapter.id).length;
  const pct = total ? Math.round((Math.min(attempted, total) / total) * 100) : 0;
  return (
    <Link
      to="/practice/$subject/$chapter"
      params={{ subject: subject.slug, chapter: chapter.slug }}
      className="bg-gradient-card block rounded-2xl border border-border p-4"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold">{chapter.name}</p>
          <p className="text-[11px] text-muted-foreground">{total} PYQs · {attempted} attempted</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`bg-gradient-to-r ${subject.hue} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </Link>
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
