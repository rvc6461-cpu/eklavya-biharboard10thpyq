import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchSubjects, type DbSubject } from "@/lib/pyq/db";

export const Route = createFileRoute("/library/notes/")({
  head: () => ({
    meta: [
      { title: "Handwritten Notes · Eklavya" },
      { name: "description", content: "Chapter-wise premium handwritten notes for every Bihar Board Class 10 subject." },
      { property: "og:title", content: "Handwritten Notes · Eklavya" },
      { property: "og:description", content: "Premium chapter-wise handwritten notes for Bihar Board Class 10 preparation." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotesSubjects,
});

function NotesSubjects() {
  const [subjects, setSubjects] = useState<DbSubject[]>([]);
  useEffect(() => {
    fetchSubjects().then(setSubjects);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/library" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">Handwritten Notes</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-3 px-5">
          {subjects.map((s) => (
            <Link
              key={s.id}
              to="/library/notes/$subject"
              params={{ subject: s.id }}
              className="bg-gradient-card flex items-center gap-3 rounded-2xl border border-border p-4 transition hover:border-primary/50"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.hue} text-base`}>
                {s.glyph}
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">Chapter-wise notes</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </main>
      </div>
    </div>
  );
}
