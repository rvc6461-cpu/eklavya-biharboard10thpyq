import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchSubjects, type DbSubject } from "@/lib/pyq/db";
import { fetchResources, type LibraryResource } from "@/lib/pyq/library";
import { EmptyState, ResourceRow } from "@/components/library/ResourceRow";

export const Route = createFileRoute("/library/formulas")({
  head: () => ({
    meta: [
      { title: "Formula Sheets · Eklavya" },
      { name: "description", content: "Subject-wise handwritten quick revision formula sheets for Bihar Board Class 10." },
      { property: "og:title", content: "Formula Sheets · Eklavya" },
      { property: "og:description", content: "Handwritten quick revision sheets for Maths, Science, Social Science, English, Hindi and Sanskrit." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FormulasPage,
});

function FormulasPage() {
  const [subjects, setSubjects] = useState<DbSubject[]>([]);
  const [rows, setRows] = useState<LibraryResource[] | null>(null);

  useEffect(() => {
    fetchSubjects().then(setSubjects);
    fetchResources("formula_sheet").then(setRows);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/library" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">Formula Sheet</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-3 px-5">
          {rows === null ? (
            <p className="text-center text-xs text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <EmptyState text="No formula sheets uploaded yet." />
          ) : (
            rows.map((r) => (
              <ResourceRow
                key={r.id}
                resource={r}
                label={`${subjects.find((s) => s.id === r.subject_id)?.name ?? r.title} Quick Revision`}
              />
            ))
          )}
        </main>
      </div>
    </div>
  );
}
