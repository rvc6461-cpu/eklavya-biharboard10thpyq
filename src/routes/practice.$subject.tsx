import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { getSubject } from "@/lib/pyq/data";
import { usePyqStore } from "@/lib/pyq/store";

export const Route = createFileRoute("/practice/$subject")({
  loader: ({ params }) => {
    const subject = getSubject(params.subject);
    if (!subject) throw notFound();
    return { subject };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.subject.name ?? "Subject"} Chapters · Eklavya` },
      { name: "description", content: `Chapter-wise PYQ practice for Class 10 ${loaderData?.subject.name ?? ""}.` },
    ],
  }),
  errorComponent: () => <div className="p-6 text-center">Something went wrong.</div>,
  notFoundComponent: () => <div className="p-6 text-center">Subject not found.</div>,
  component: SubjectPage,
});

function SubjectPage() {
  const { subject } = Route.useLoaderData();
  const { state } = usePyqStore();

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
          {subject.chapters.map((ch) => {
            const attempted = ch.questions.filter((q) => state.attempts[q.id]).length;
            const correct = ch.questions.filter((q) => state.attempts[q.id]?.correct).length;
            const pct = ch.questions.length ? Math.round((attempted / ch.questions.length) * 100) : 0;
            return (
              <Link
                key={ch.id}
                to="/practice/$subject/$chapter"
                params={{ subject: subject.id, chapter: ch.id }}
                className="bg-gradient-card block rounded-2xl border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold">{ch.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ch.questions.length} PYQs · {attempted} attempted
                    </p>
                  </div>
                  {attempted > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      <span className="text-[11px] font-bold text-success">{correct}/{attempted}</span>
                    </div>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`bg-gradient-to-r ${subject.hue} h-full rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </main>
      </div>
    </div>
  );
}
