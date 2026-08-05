import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Crown, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchSubjects, type DbSubject } from "@/lib/pyq/db";
import { fetchResources, type LibraryResource } from "@/lib/pyq/library";
import { ResourceRow } from "@/components/library/ResourceRow";

export const Route = createFileRoute("/library/")({
  head: () => ({
    meta: [
      { title: "PDF Library · Eklavya" },
      { name: "description", content: "Bihar Board 10th previous year papers, formula sheets and handwritten notes in one PDF library." },
      { property: "og:title", content: "PDF Library · Eklavya" },
      { property: "og:description", content: "Subject-wise previous year question papers (2021–2026), formula sheets and premium handwritten notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryIndex,
});

function LibraryIndex() {
  const [subjects, setSubjects] = useState<DbSubject[]>([]);
  const [papers, setPapers] = useState<LibraryResource[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchSubjects().then(setSubjects);
    fetchResources("pyq_paper").then(setPapers);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return papers.filter((p) => {
      const subject = subjects.find((s) => s.id === p.subject_id)?.name ?? "";
      return (
        subject.toLowerCase().includes(q) ||
        String(p.year ?? "").includes(q) ||
        p.title.toLowerCase().includes(q)
      );
    });
  }, [query, papers, subjects]);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">PDF Library</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-5 px-5">
          <div className="bg-gradient-card flex items-center gap-2 rounded-2xl border border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject or year e.g. Science 2024"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {results ? (
            <div className="space-y-3">
              {results.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">No papers found.</p>
              ) : (
                results.map((r) => (
                  <ResourceRow
                    key={r.id}
                    resource={r}
                    label={`${subjects.find((s) => s.id === r.subject_id)?.name ?? "Paper"} · ${r.year ?? ""}`}
                  />
                ))
              )}
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  Previous year papers
                </p>
                {subjects.map((s) => (
                  <Link
                    key={s.id}
                    to="/library/papers/$subject"
                    params={{ subject: s.id }}
                    className="bg-gradient-card flex items-center gap-3 rounded-2xl border border-border p-4 transition hover:border-primary/50"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.hue} text-base`}>
                      {s.glyph}
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-sm font-bold">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">2021 – 2026 papers</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                ))}
              </section>

              <section className="space-y-3">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  Study resources
                </p>
                <Link
                  to="/library/formulas"
                  className="bg-gradient-card flex items-center gap-3 rounded-2xl border border-border p-4 transition hover:border-primary/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                    <Sparkles className="h-5 w-5 text-amber-300" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold">Formula Sheet</p>
                    <p className="text-[11px] text-muted-foreground">Subject-wise quick revision</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link
                  to="/library/notes"
                  className="bg-gradient-card flex items-center gap-3 rounded-2xl border border-gold/30 p-4 transition hover:border-gold/60"
                >
                  <div className="bg-gradient-gold flex h-10 w-10 items-center justify-center rounded-xl">
                    <Crown className="h-5 w-5 text-gold-foreground" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold">Handwritten Notes</p>
                    <p className="text-[11px] text-muted-foreground">Chapter-wise · Premium</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gold" />
                </Link>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
