import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchSubjectById, type DbSubject } from "@/lib/pyq/db";
import { fetchResources, PYQ_YEARS, type LibraryResource } from "@/lib/pyq/library";
import { EmptyState, ResourceRow } from "@/components/library/ResourceRow";

export const Route = createFileRoute("/library/papers/$subject")({
  head: () => ({
    meta: [
      { title: "Previous Year Papers · Eklavya" },
      { name: "description", content: "Bihar Board 10th subject-wise previous year question papers from 2021 to 2026." },
      { property: "og:title", content: "Previous Year Papers · Eklavya" },
      { property: "og:description", content: "Download or read subject-wise Bihar Board 10th question papers (2021–2026)." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PapersPage,
});

function PapersPage() {
  const { subject } = Route.useParams();
  const [sub, setSub] = useState<DbSubject | null>(null);
  const [papers, setPapers] = useState<LibraryResource[] | null>(null);

  useEffect(() => {
    fetchSubjectById(subject).then(setSub);
    fetchResources("pyq_paper").then((rows) =>
      setPapers(rows.filter((r) => r.subject_id === subject)),
    );
  }, [subject]);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/library" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">{sub?.name ?? "Papers"}</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-3 px-5">
          {papers === null ? (
            <p className="text-center text-xs text-muted-foreground">Loading…</p>
          ) : papers.length === 0 ? (
            <EmptyState text="No question papers uploaded for this subject yet." />
          ) : (
            PYQ_YEARS.map((year) => {
              const rows = papers.filter((p) => p.year === year);
              if (rows.length === 0) return null;
              return rows.map((r) => (
                <ResourceRow key={r.id} resource={r} label={`${year} Question Paper`} />
              ));
            })
          )}
        </main>
      </div>
    </div>
  );
}
