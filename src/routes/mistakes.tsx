import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, NotebookPen, Search, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchLookupMaps, fetchQuestionsByIds, toClientQuestion, type DbQuestion } from "@/lib/pyq/db";
import { usePyqStore } from "@/lib/pyq/store";

export const Route = createFileRoute("/mistakes")({
  head: () => ({ meta: [
    { title: "Mistake Book · Eklavya" },
    { name: "description", content: "Retry, master, search and filter questions saved from practice and mock tests." },
    { property: "og:title", content: "Mistake Book · Eklavya" },
    { property: "og:description", content: "Turn every wrong answer into progress." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MistakesPage,
});

type Item = { row: DbQuestion; subjectName: string; chapterName: string };

function MistakesPage() {
  const { state, recordAttempt } = usePyqStore();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [chapter, setChapter] = useState("all");
  const [retry, setRetry] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchQuestionsByIds(state.mistakes), fetchLookupMaps()]).then(([rows, maps]) => {
      if (cancelled) return;
      setItems(rows.map((row) => ({
        row,
        subjectName: maps.subjects[row.subject_id]?.name ?? "Subject",
        chapterName: maps.chapters[row.chapter_id]?.name ?? "Chapter",
      })));
    });
    return () => { cancelled = true; };
  }, [state.mistakes]);

  const filtered = useMemo(() => items.filter((item) => {
    const q = search.trim().toLocaleLowerCase();
    return (subject === "all" || item.row.subject_id === subject)
      && (chapter === "all" || item.row.chapter_id === chapter)
      && (!q || item.row.text.toLocaleLowerCase().includes(q));
  }), [items, search, subject, chapter]);
  const subjects = Array.from(new Map(items.map((i) => [i.row.subject_id, i.subjectName])));
  const chapters = Array.from(new Map(items.filter((i) => subject === "all" || i.row.subject_id === subject).map((i) => [i.row.chapter_id, i.chapterName])));

  if (retry && filtered.length) {
    const item = filtered[Math.min(index, filtered.length - 1)];
    const q = toClientQuestion(item.row);
    const revealed = picked != null;
    return (
      <div className="min-h-screen bg-background px-5 pt-6 pb-10 text-foreground">
        <div className="mx-auto max-w-md space-y-4">
          <header className="flex items-center justify-between">
            <button onClick={() => setRetry(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card" aria-label="Back to mistake book"><ArrowLeft className="h-5 w-5" /></button>
            <div className="text-center"><p className="text-[11px] text-muted-foreground">RETRY WRONG QUESTIONS</p><p className="font-display text-sm font-bold">{index + 1} of {filtered.length}</p></div><div className="w-10" />
          </header>
          <div className="bg-gradient-card rounded-3xl border border-border p-5"><p className="text-[10px] text-muted-foreground">{item.subjectName} · {item.chapterName}</p><p className="font-display mt-2 font-semibold leading-relaxed">{q.text}</p></div>
          <div className="space-y-2.5">{q.options.map((option, i) => {
            const cls = !revealed ? "border-border bg-card" : i === q.answer ? "border-success/60 bg-success/15" : i === picked ? "border-destructive/60 bg-destructive/15" : "border-border bg-card opacity-60";
            return <button key={i} disabled={revealed} onClick={() => { setPicked(i); recordAttempt({ questionId: q.id, subjectId: item.row.subject_id, chapterId: item.row.chapter_id, selected: i, correct: i === q.answer, at: Date.now() }); }} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${cls}`}><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted font-bold">{i === q.answer && revealed ? <Check className="h-4 w-4 text-success" /> : i === picked && revealed ? <X className="h-4 w-4 text-destructive" /> : String.fromCharCode(65 + i)}</span><span className="text-sm">{option}</span></button>;
          })}</div>
          {revealed && <div className="rounded-2xl border border-border bg-card p-4"><p className={`font-bold ${picked === q.answer ? "text-success" : "text-destructive"}`}>{picked === q.answer ? "Mastered! Removed from active mistakes." : "Keep trying — this stays in your Mistake Book."}</p><p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p></div>}
          <div className="flex gap-2"><button disabled={index === 0} onClick={() => { setIndex(index - 1); setPicked(null); }} className="flex flex-1 items-center justify-center rounded-2xl border border-border bg-card py-3 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><button onClick={() => { if (index + 1 >= filtered.length) setRetry(false); else setIndex(index + 1); setPicked(null); }} className="bg-gradient-primary flex flex-1 items-center justify-center rounded-2xl py-3 font-bold text-primary-foreground">{index + 1 >= filtered.length ? "Finish" : "Next"}<ChevronRight className="h-4 w-4" /></button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-md">
      <header className="flex items-center justify-between px-5 pt-6 pb-4"><Link to="/practice" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"><ArrowLeft className="h-5 w-5" /></Link><div className="text-center"><h1 className="font-display text-base font-bold">Mistake Book</h1><p className="text-[10px] text-muted-foreground">{state.mistakes.length} active · {state.mastered.length} mastered</p></div><div className="w-10" /></header>
      <main className="space-y-4 px-5">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions" className="h-10 w-full rounded-2xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-primary" /></div>
        <div className="grid grid-cols-2 gap-2"><select value={subject} onChange={(e) => { setSubject(e.target.value); setChapter("all"); }} className="h-10 rounded-2xl border border-border bg-card px-3 text-xs"><option value="all">All subjects</option>{subjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={chapter} onChange={(e) => setChapter(e.target.value)} className="h-10 rounded-2xl border border-border bg-card px-3 text-xs"><option value="all">All chapters</option>{chapters.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
        <button disabled={!filtered.length} onClick={() => { setIndex(0); setPicked(null); setRetry(true); }} className="bg-gradient-primary shadow-glow flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-display font-bold text-primary-foreground disabled:opacity-40"><NotebookPen className="h-5 w-5" /> Retry Wrong Questions ({filtered.length})</button>
        {!filtered.length ? <div className="rounded-3xl border border-border bg-gradient-card p-8 text-center"><NotebookPen className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-display font-bold">No matching mistakes</p><p className="mt-1 text-xs text-muted-foreground">Wrong answers from practice and mocks appear here automatically.</p></div> : filtered.map((item) => { const q = toClientQuestion(item.row); return <div key={q.id} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-[11px] font-semibold text-destructive">{item.subjectName} · {item.chapterName}</p><p className="mt-2 text-sm font-medium">{q.text}</p><p className="mt-3 rounded-xl bg-success/10 px-3 py-2 text-xs"><span className="font-bold text-success">Correct: </span>{q.options[q.answer]}</p></div>; })}
      </main>
    </div></div>
  );
}