import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Card } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Upload, Search } from "lucide-react";

export const Route = createFileRoute("/admin/questions")({
  head: () => ({ meta: [{ title: "Questions · Admin" }, { name: "robots", content: "noindex" }] }),
  component: QuestionsAdmin,
});

type Q = {
  id?: string; subject_id: string; chapter_id: string; text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_answer: number; difficulty: "easy"|"medium"|"hard";
  is_pyq: boolean; year: number | null; explanation: string | null;
  tags: string[]; status: "draft"|"published";
};

const PAGE_SIZE = 20;

function QuestionsAdmin() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [rows, setRows] = useState<Q[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Q> | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    supabase.from("subjects").select("*").order("sort_order").then(({ data }) => setSubjects(data ?? []));
    supabase.from("chapters").select("*").order("sort_order").then(({ data }) => setChapters(data ?? []));
  }, []);

  const load = async () => {
    setRows(null);
    let q: any = supabase.from("questions").select("*", { count: "exact" });
    if (subjectFilter !== "all") q = q.eq("subject_id", subjectFilter);
    if (chapterFilter !== "all") q = q.eq("chapter_id", chapterFilter);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (difficultyFilter !== "all") q = q.eq("difficulty", difficultyFilter);
    if (search.trim()) q = q.ilike("text", `%${search.trim()}%`);
    q = q.order("created_at", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    setRows((data ?? []) as Q[]); setTotal(count ?? 0);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [subjectFilter, chapterFilter, statusFilter, difficultyFilter, search, page]);

  const chapMap = useMemo(() => Object.fromEntries(chapters.map((c) => [c.id, c])), [chapters]);
  const subjMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);

  const chaptersForEdit = editing?.subject_id ? chapters.filter((c) => c.subject_id === editing.subject_id) : [];

  const save = async () => {
    if (!editing) return;
    const p = {
      subject_id: editing.subject_id, chapter_id: editing.chapter_id, text: editing.text,
      option_a: editing.option_a, option_b: editing.option_b, option_c: editing.option_c, option_d: editing.option_d,
      correct_answer: editing.correct_answer ?? 0, difficulty: editing.difficulty ?? "medium",
      is_pyq: editing.is_pyq ?? false, year: editing.year || null, explanation: editing.explanation || null,
      tags: editing.tags ?? [], status: editing.status ?? "published",
    };
    if (!p.subject_id || !p.chapter_id || !p.text || !p.option_a || !p.option_b || !p.option_c || !p.option_d) {
      alert("Fill all required fields."); return;
    }
    if (editing.id) await supabase.from("questions").update(p).eq("id", editing.id);
    else await supabase.from("questions").insert(p as any);
    setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await supabase.from("questions").delete().eq("id", id);
    load();
  };

  const bulkImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (k: string) => header.indexOf(k);
      const need = ["subject_slug","chapter_slug","text","option_a","option_b","option_c","option_d","correct_answer"];
      for (const k of need) if (idx(k) < 0) throw new Error(`Missing column: ${k}`);
      const inserts: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]; if (!r || r.length < need.length || !r[idx("text")]) continue;
        const subj = subjects.find((s) => s.slug === r[idx("subject_slug")]);
        const chap = chapters.find((c) => c.slug === r[idx("chapter_slug")] && (!subj || c.subject_id === subj.id));
        if (!subj || !chap) continue;
        inserts.push({
          subject_id: subj.id, chapter_id: chap.id, text: r[idx("text")],
          option_a: r[idx("option_a")], option_b: r[idx("option_b")], option_c: r[idx("option_c")], option_d: r[idx("option_d")],
          correct_answer: Number(r[idx("correct_answer")]) || 0,
          difficulty: (r[idx("difficulty")] as any) || "medium",
          is_pyq: r[idx("is_pyq")] ? /^(true|yes|1)$/i.test(r[idx("is_pyq")]) : true,
          year: r[idx("year")] ? Number(r[idx("year")]) : null,
          explanation: r[idx("explanation")] || null,
          tags: r[idx("tags")] ? r[idx("tags")].split(";").map((s: string) => s.trim()).filter(Boolean) : [],
          status: (r[idx("status")] as any) || "published",
        });
      }
      if (inserts.length === 0) { alert("No valid rows found."); return; }
      const { error } = await supabase.from("questions").insert(inserts);
      if (error) throw error;
      alert(`Imported ${inserts.length} questions.`); load();
    } catch (e: any) {
      alert("Import failed: " + e.message);
    } finally { setImporting(false); }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell title="Questions">
      <div className="mb-4 grid grid-cols-2 md:grid-cols-6 gap-2">
        <select className="input col-span-2 md:col-span-1" value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setChapterFilter("all"); setPage(0); }}>
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input col-span-2 md:col-span-1" value={chapterFilter} onChange={(e) => { setChapterFilter(e.target.value); setPage(0); }}>
          <option value="all">All chapters</option>
          {chapters.filter((c) => subjectFilter === "all" || c.subject_id === subjectFilter).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="all">Any status</option><option value="published">Published</option><option value="draft">Draft</option>
        </select>
        <select className="input" value={difficultyFilter} onChange={(e) => { setDifficultyFilter(e.target.value); setPage(0); }}>
          <option value="all">Any diff.</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
        <div className="col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input className="input pl-9" placeholder="Search question text…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <label className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-muted">
          <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Bulk import (CSV)"}
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && bulkImport(e.target.files[0])} />
        </label>
        <button onClick={() => setEditing({ status: "published", difficulty: "medium", is_pyq: true, correct_answer: 0, tags: [] })}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add question
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-2">CSV columns: subject_slug, chapter_slug, text, option_a..d, correct_answer (0-3), difficulty, is_pyq, year, explanation, tags (semicolon-separated), status</p>

      <Card className="!p-0 overflow-x-auto">
        {rows === null ? <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div> : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">Question</th><th className="p-3 text-left">Subject/Chapter</th><th className="p-3 text-left">Diff</th><th className="p-3 text-left">PYQ</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="p-3 max-w-md"><p className="line-clamp-2 font-medium">{r.text}</p></td>
                  <td className="p-3 text-xs text-muted-foreground">{subjMap[r.subject_id]?.name}<br />{chapMap[r.chapter_id]?.name}</td>
                  <td className="p-3 capitalize">{r.difficulty}</td>
                  <td className="p-3">{r.is_pyq ? (r.year || "Yes") : "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "published" ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{r.status}</span></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(r)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(r.id!)} className="p-1.5 hover:bg-muted rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No questions.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">{total.toLocaleString()} total</p>
        <div className="flex items-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40">Prev</button>
          <span>Page {page + 1} / {pageCount}</span>
          <button disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40">Next</button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-card border border-border p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-bold text-lg">{editing.id ? "Edit question" : "Add question"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-1"><span className="text-xs uppercase font-semibold text-muted-foreground">Subject</span>
                <select className="input mt-1" value={editing.subject_id ?? ""} onChange={(e) => setEditing({ ...editing, subject_id: e.target.value, chapter_id: "" })}>
                  <option value="">Select</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="block col-span-1"><span className="text-xs uppercase font-semibold text-muted-foreground">Chapter</span>
                <select className="input mt-1" value={editing.chapter_id ?? ""} onChange={(e) => setEditing({ ...editing, chapter_id: e.target.value })} disabled={!editing.subject_id}>
                  <option value="">Select</option>
                  {chaptersForEdit.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Question</span>
              <textarea className="input mt-1" rows={3} value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
            </label>
            {(["a","b","c","d"] as const).map((k, i) => (
              <label key={k} className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Option {k.toUpperCase()} {editing.correct_answer === i && <span className="text-emerald-500 ml-1">✓ correct</span>}</span>
                <div className="flex gap-2 mt-1">
                  <input className="input flex-1" value={(editing as any)[`option_${k}`] ?? ""} onChange={(e) => setEditing({ ...editing, [`option_${k}`]: e.target.value })} />
                  <button type="button" onClick={() => setEditing({ ...editing, correct_answer: i })} className={`px-3 rounded-xl text-xs font-semibold ${editing.correct_answer === i ? "bg-emerald-500 text-white" : "border border-border"}`}>Set correct</button>
                </div>
              </label>
            ))}
            <div className="grid grid-cols-3 gap-3">
              <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Difficulty</span>
                <select className="input mt-1" value={editing.difficulty ?? "medium"} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value as any })}>
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </label>
              <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Status</span>
                <select className="input mt-1" value={editing.status ?? "published"} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                  <option value="published">Published</option><option value="draft">Draft</option>
                </select>
              </label>
              <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Year</span>
                <input type="number" className="input mt-1" value={editing.year ?? ""} onChange={(e) => setEditing({ ...editing, year: Number(e.target.value) || null })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_pyq ?? true} onChange={(e) => setEditing({ ...editing, is_pyq: e.target.checked })} /> Previous Year Question</label>
            <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Explanation (optional)</span>
              <textarea className="input mt-1" rows={2} value={editing.explanation ?? ""} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} />
            </label>
            <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Tags (comma-separated)</span>
              <input className="input mt-1" value={(editing.tags ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl border border-border text-sm">Cancel</button>
              <button onClick={save} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;border-radius:12px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </AdminShell>
  );
}

// Minimal CSV parser (handles quoted fields, commas, escaped quotes, newlines)
function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
