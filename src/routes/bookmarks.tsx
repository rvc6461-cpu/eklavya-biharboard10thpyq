import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BookmarkCheck, Bookmark } from "lucide-react";
import { fetchLookupMaps, fetchQuestionsByIds, toClientQuestion, type DbQuestion } from "@/lib/pyq/db";
import { usePyqStore } from "@/lib/pyq/store";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({ meta: [
    { title: "Favourite Questions · Eklavya" },
    { name: "description", content: "Your favourite questions from practice and full mock tests." },
    { property: "og:title", content: "Favourite Questions · Eklavya" },
    { property: "og:description", content: "Review saved Bihar Board questions." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BookmarksPage,
});

type Item = { row: DbQuestion; subjectName: string; chapterName: string };
function BookmarksPage() {
  const { state, toggleBookmark } = usePyqStore();
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchQuestionsByIds(state.bookmarks), fetchLookupMaps()]).then(([rows, maps]) => {
      if (!cancelled) setItems(rows.map((row) => ({ row, subjectName: maps.subjects[row.subject_id]?.name ?? "Subject", chapterName: maps.chapters[row.chapter_id]?.name ?? "Chapter" })));
    });
    return () => { cancelled = true; };
  }, [state.bookmarks]);
  return <div className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-md">
    <header className="flex items-center justify-between px-5 pt-6 pb-4"><Link to="/practice" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"><ArrowLeft className="h-5 w-5" /></Link><div className="text-center"><h1 className="font-display text-base font-bold">Favourite Questions</h1><p className="text-[10px] text-muted-foreground">{state.bookmarks.length} saved</p></div><div className="w-10" /></header>
    <main className="space-y-3 px-5">{items.length === 0 ? <div className="rounded-3xl border border-border bg-gradient-card p-8 text-center"><Bookmark className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-display font-bold">No favourites yet</p><p className="mt-1 text-xs text-muted-foreground">Tap the bookmark icon on any practice or mock question.</p></div> : items.map((item) => { const q = toClientQuestion(item.row); return <div key={q.id} className="bg-gradient-card rounded-2xl border border-border p-4"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-muted-foreground">{item.subjectName} · {item.chapterName}</p><button onClick={() => toggleBookmark(q.id, { subjectId: item.row.subject_id, chapterId: item.row.chapter_id })} aria-label="Remove favourite" className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15"><BookmarkCheck className="h-4 w-4 text-gold" /></button></div><p className="mt-2 text-sm font-medium">{q.text}</p><p className="mt-3 rounded-xl bg-success/10 px-3 py-2 text-xs"><span className="font-bold text-success">Answer: </span>{q.options[q.answer]}</p></div>; })}</main>
  </div></div>;
}