import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, FileText, Search as SearchIcon, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchSubjects, type DbSubject } from "@/lib/pyq/db";
import { fetchResources, type LibraryResource } from "@/lib/pyq/library";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [
    { title: "Search · Eklavya" },
    { name: "description", content: "Search Eklavya subjects, PYQ papers, formula sheets and notes." },
    { property: "og:title", content: "Search · Eklavya" },
    { property: "og:description", content: "Find study material quickly in Eklavya." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SearchPage,
});

function SearchPage() {
  const [query, setQuery] = useState("");
  const [subjects, setSubjects] = useState<DbSubject[]>([]);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  useEffect(() => { Promise.all([fetchSubjects(), fetchResources()]).then(([s, r]) => { setSubjects(s); setResources(r); }); }, []);
  const term = query.trim().toLowerCase();
  const subjectResults = useMemo(() => subjects.filter((s) => !term || `${s.name} ${s.short}`.toLowerCase().includes(term)), [subjects, term]);
  const resourceResults = useMemo(() => resources.filter((r) => !term || r.title.toLowerCase().includes(term)), [resources, term]);
  return <div className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-md"><header className="flex items-center justify-between px-5 pt-6 pb-4"><Link to="/" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link><h1 className="font-display text-base font-bold">Search</h1><div className="w-10" /></header><main className="space-y-5 px-5"><div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3"><SearchIcon className="h-4 w-4 text-muted-foreground" /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subjects, papers or notes" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div>{term && subjectResults.length === 0 && resourceResults.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"><SearchIcon className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No results found</p><p className="mt-1 text-xs text-muted-foreground">Try a subject, year or resource title.</p></div> : <><ResultGroup title="Subjects" icon={BookOpen}>{subjectResults.map((s) => <Link key={s.id} to="/practice/$subject" params={{ subject: s.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"><div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.hue}`}>{s.glyph}</div><span className="text-sm font-semibold">{s.name}</span></Link>)}</ResultGroup><ResultGroup title="Study resources" icon={term ? FileText : Sparkles}>{resourceResults.map((r) => <Link key={r.id} to="/library/view/$id" params={{ id: r.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><FileText className="h-4 w-4 text-primary" /></div><span className="text-sm font-semibold">{r.title}</span></Link>)}</ResultGroup></>}</main></div></div>;
}

function ResultGroup({ title, icon: Icon, children }: { title: string; icon: typeof BookOpen; children: React.ReactNode }) { return <section className="space-y-2"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h2 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{title}</h2></div>{children}</section>; }