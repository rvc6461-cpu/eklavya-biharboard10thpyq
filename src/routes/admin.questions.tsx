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
  correct_answer: number; difficulty: "easy" | "medium" | "hard";
  is_pyq: boolean; year: number | null; explanation: string | null;
  tags: string[]; status: "draft" | "published"; language?: string | null;
};

const PAGE_SIZE = 20;

function QuestionsAdmin() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subSubjects, setSubSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [rows, setRows] = useState<Q[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [subSubjectFilter, setSubSubjectFilter] = useState("all");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Q> | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<null | { imported: number; skipped: number; failed: number; details: string[] }>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    supabase.from("subjects").select("*").order("sort_order").then(({ data }) => setSubjects(data ?? []));
    supabase.from("sub_subjects").select("*").order("sort_order").then(({ data }) => setSubSubjects(data ?? []));
    supabase.from("chapters").select("*").order("sort_order").then(({ data }) => setChapters(data ?? []));
  }, []);

  // Chapter ids implied by the sub subject filter (questions store chapter_id).
  const subSubjectChapterIds = useMemo(
    () => (subSubjectFilter === "all" ? null : chapters.filter((c) => c.sub_subject_id === subSubjectFilter).map((c) => c.id)),
    [subSubjectFilter, chapters],
  );

  const applyFilters = (q: any) => {
    if (subjectFilter !== "all") q = q.eq("subject_id", subjectFilter);
    if (chapterFilter !== "all") q = q.eq("chapter_id", chapterFilter);
    else if (subSubjectChapterIds) q = q.in("chapter_id", subSubjectChapterIds.length ? subSubjectChapterIds : ["00000000-0000-0000-0000-000000000000"]);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (difficultyFilter !== "all") q = q.eq("difficulty", difficultyFilter);
    if (search.trim()) q = q.ilike("text", `%${search.trim()}%`);
    return q;
  };

  const load = async () => {
    setRows(null);
    let q: any = applyFilters(supabase.from("questions").select("*", { count: "exact" }));
    q = q.order("created_at", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    setRows((data ?? []) as Q[]); setTotal(count ?? 0);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [subjectFilter, subSubjectFilter, chapterFilter, statusFilter, difficultyFilter, search, page, chapters.length]);

  const bulkDeleteFiltered = async () => {
    setBulkDeleting(true);
    try {
      // Single delete statement scoped by the active filters.
      const { error } = await applyFilters(supabase.from("questions").delete());
      if (error) throw error;
      setConfirmBulk(false);
      setPage(0);
      await load();
    } catch (e: any) {
      alert("Bulk delete failed: " + (e?.message || e));
    } finally { setBulkDeleting(false); }
  };


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
      language: editing.language || null,
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
    setImportSummary(null);
    const details: string[] = [];
    let imported = 0, skipped = 0, failed = 0;
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "").normalize("NFC");
      const rows = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ""));
      if (!rows.length) throw new Error("Empty CSV.");
      const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const idx = (...keys: string[]) => {
        for (const k of keys) { const i = header.indexOf(k); if (i >= 0) return i; }
        return -1;
      };
      const iSubject = idx("subject", "subject_name", "subject_slug");
      const iSubSubject = idx("sub_subject", "sub-subject", "subsubject", "sub_subject_name", "sub_subject_slug");
      const iChapter = idx("chapter", "chapter_name", "chapter_slug");
      const iText = idx("question", "text");
      const iA = idx("option_a", "a");
      const iB = idx("option_b", "b");
      const iC = idx("option_c", "c");
      const iD = idx("option_d", "d");
      const iAns = idx("correct_answer", "answer", "correct");
      const iLang = idx("language", "lang");
      const iDiff = idx("difficulty");
      const iPyq = idx("is_pyq", "pyq");
      const iYear = idx("year");
      const iExpl = idx("explanation");
      const iTags = idx("tags");
      const iStatus = idx("status");

      const required = { subject: iSubject, chapter: iChapter, question: iText, option_a: iA, option_b: iB, option_c: iC, option_d: iD, correct_answer: iAns };
      const missing = Object.entries(required).filter(([, i]) => i < 0).map(([k]) => k);
      if (missing.length) throw new Error("Missing columns: " + missing.join(", "));

      // Cache subjects / sub-subjects / chapters
      const [{ data: subjRows }, { data: ssRows }, { data: chapRows }] = await Promise.all([
        supabase.from("subjects").select("id,name,slug"),
        supabase.from("sub_subjects").select("id,name,slug,subject_id"),
        supabase.from("chapters").select("id,name,slug,subject_id,sub_subject_id"),
      ]);
      const subjectsCache = [...(subjRows ?? [])] as any[];
      const subSubjectsCache = [...(ssRows ?? [])] as any[];
      const chaptersCache = [...(chapRows ?? [])] as any[];

      // Unicode-safe: keeps Devanagari/Hindi/Sanskrit characters instead of
      // collapsing every non-ASCII name to the same slug (root cause of the
      // "everything linked to the first sub subject/chapter" bug).
      const hash = (s: string) => {
        let h = 5381;
        for (let n = 0; n < s.length; n++) h = ((h << 5) + h + s.charCodeAt(n)) >>> 0;
        return h.toString(36);
      };
      const norm = (s: string) => (s ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
      const slugify = (s: string) => {
        const base = norm(s)
          .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 50);
        const ascii = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        // Non-latin names get a deterministic, unique suffix so two different
        // Sanskrit names can never collide on the same slug.
        return ascii === base && base ? base : `${ascii || "item"}-${hash(norm(s))}`;
      };

      const findOrCreateSubject = async (raw: string) => {
        const name = (raw ?? "").normalize("NFC").trim(); if (!name) return null;
        const slug = slugify(name);
        const found = subjectsCache.find((s) => norm(s.name) === norm(name) || s.slug === slug);
        if (found) return found;
        const { data, error } = await supabase.from("subjects").insert({
          slug, name, short: name.slice(0, 4), glyph: "★", hue: "from-indigo-500 to-violet-600",
          sort_order: subjectsCache.length, is_active: true,
        }).select("id,name,slug").single();
        if (error || !data) throw new Error(`Subject "${name}": ${error?.message || "insert failed"}`);
        subjectsCache.push(data);
        return data;
      };

      const findOrCreateSubSubject = async (subject: any, raw: string) => {
        const name = (raw ?? "").normalize("NFC").trim(); if (!name) return null;
        const slug = slugify(name);
        const found = subSubjectsCache.find(
          (s) => s.subject_id === subject.id && (norm(s.name) === norm(name) || s.slug === slug),
        );
        if (found) return found;
        const { data, error } = await supabase.from("sub_subjects").insert({
          subject_id: subject.id, slug, name,
          sort_order: subSubjectsCache.filter((s) => s.subject_id === subject.id).length,
          is_active: true,
        }).select("id,name,slug,subject_id").single();
        if (error || !data) throw new Error(`Sub subject "${name}": ${error?.message || "insert failed"}`);
        subSubjectsCache.push(data);
        return data;
      };

      const findOrCreateChapter = async (subject: any, subSubject: any | null, raw: string) => {
        const name = (raw ?? "").normalize("NFC").trim(); if (!name) return null;
        const slug = slugify(name);
        // Scope the lookup to the row's sub subject so identically named
        // chapters under different sub subjects stay separate.
        const matches = (c: any) =>
          c.subject_id === subject.id && (norm(c.name) === norm(name) || c.slug === slug);
        const found = subSubject
          ? chaptersCache.find((c) => matches(c) && (c.sub_subject_id === subSubject.id || !c.sub_subject_id))
          : chaptersCache.find((c) => matches(c));
        if (found) {
          if (subSubject && !found.sub_subject_id) {
            await supabase.from("chapters").update({ sub_subject_id: subSubject.id }).eq("id", found.id);
            found.sub_subject_id = subSubject.id;
          }
          return found;
        }
        const { data, error } = await supabase.from("chapters").insert({
          subject_id: subject.id, sub_subject_id: subSubject?.id ?? null,
          slug: chaptersCache.some((c) => c.slug === slug && c.subject_id === subject.id)
            ? `${slug}-${hash(norm(name) + (subSubject?.id ?? ""))}`
            : slug,
          name,
          sort_order: chaptersCache.filter((c) => c.subject_id === subject.id).length,
          is_active: true,
        }).select("id,name,slug,subject_id,sub_subject_id").single();
        if (error || !data) throw new Error(`Chapter "${name}": ${error?.message || "insert failed"}`);
        chaptersCache.push(data);
        return data;
      };

      const parseCorrect = (raw: string): number => {
        const t = raw.trim().toLowerCase();
        if (["0", "1", "2", "3"].includes(t)) return Number(t);
        if (["a", "b", "c", "d"].includes(t)) return "abcd".indexOf(t);
        return -1;
      };

      const cell = (r: string[], i: number) => (i >= 0 && r[i] != null ? String(r[i]).normalize("NFC").trim() : "");

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const line = i + 1;
        // Every row resolves its own subject / sub subject / chapter — nothing
        // is carried over from the previous iteration.
        let subject: any = null, subSubject: any = null, chapter: any = null;
        try {
          const subjectName = cell(r, iSubject);
          const subSubjectName = cell(r, iSubSubject);
          const chapterName = cell(r, iChapter);
          const questionText = cell(r, iText);
          if (!subjectName || !chapterName || !questionText) {
            skipped++;
            details.push(`Line ${line}: missing ${[!subjectName && "subject", !chapterName && "chapter", !questionText && "question"].filter(Boolean).join(", ")}`);
            continue;
          }

          subject = await findOrCreateSubject(subjectName);
          if (!subject) { failed++; details.push(`Line ${line}: could not resolve subject "${subjectName}"`); continue; }
          subSubject = subSubjectName ? await findOrCreateSubSubject(subject, subSubjectName) : null;
          chapter = await findOrCreateChapter(subject, subSubject, chapterName);
          if (!chapter) { failed++; details.push(`Line ${line}: could not resolve chapter "${chapterName}"`); continue; }

          const correct = parseCorrect(cell(r, iAns));
          if (correct < 0) { failed++; details.push(`Line ${line}: invalid correct_answer "${cell(r, iAns)}"`); continue; }

          // Skip duplicates: same chapter + identical question text
          const { data: dup } = await supabase.from("questions")
            .select("id").eq("chapter_id", chapter.id).eq("text", questionText).limit(1);
          if (dup && dup.length) { skipped++; details.push(`Line ${line}: duplicate in chapter "${chapter.name}"`); continue; }

          const diffRaw = cell(r, iDiff).toLowerCase();
          const payload = {
            subject_id: subject.id, chapter_id: chapter.id, text: questionText,
            option_a: cell(r, iA), option_b: cell(r, iB), option_c: cell(r, iC), option_d: cell(r, iD),
            correct_answer: correct,
            difficulty: (["easy", "medium", "hard"].includes(diffRaw) ? diffRaw : "medium") as any,
            is_pyq: iPyq >= 0 ? /^(true|yes|1)$/i.test(cell(r, iPyq)) : true,
            year: cell(r, iYear) ? Number(cell(r, iYear)) || null : null,
            explanation: cell(r, iExpl) || null,
            tags: cell(r, iTags) ? cell(r, iTags).split(";").map((s) => s.trim()).filter(Boolean) : [],
            status: (cell(r, iStatus) === "draft" ? "draft" : "published") as any,
            language: cell(r, iLang) || null,
          };
          const { error } = await supabase.from("questions").insert(payload);
          if (error) { failed++; details.push(`Line ${line}: ${error.message}`); continue; }
          imported++;
        } catch (rowErr: any) {
          failed++; details.push(`Line ${line}: ${rowErr?.message ?? String(rowErr)}`);
        }
      }


      setImportSummary({ imported, skipped, failed, details });
      load();
    } catch (e: any) {
      alert("Import failed: " + e.message);
    } finally { setImporting(false); }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell title="Questions">
      <div className="mb-4 grid grid-cols-2 md:grid-cols-6 gap-2">
        <select className="input col-span-2 md:col-span-1" value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setSubSubjectFilter("all"); setChapterFilter("all"); setPage(0); }}>
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input col-span-2 md:col-span-1" value={subSubjectFilter} onChange={(e) => { setSubSubjectFilter(e.target.value); setChapterFilter("all"); setPage(0); }}>
          <option value="all">All sub subjects</option>
          {subSubjects.filter((s) => subjectFilter === "all" || s.subject_id === subjectFilter).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input col-span-2 md:col-span-1" value={chapterFilter} onChange={(e) => { setChapterFilter(e.target.value); setPage(0); }}>
          <option value="all">All chapters</option>
          {chapters
            .filter((c) => (subjectFilter === "all" || c.subject_id === subjectFilter) && (subSubjectFilter === "all" || c.sub_subject_id === subSubjectFilter))
            .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-muted">
            <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Bulk import (CSV)"}
            <input type="file" accept=".csv" className="hidden" disabled={importing} onChange={(e) => e.target.files?.[0] && bulkImport(e.target.files[0])} />
          </label>
          <span className="text-xs text-muted-foreground">{total.toLocaleString()} matching questions</span>
          <button
            onClick={() => setConfirmBulk(true)}
            disabled={total === 0 || rows === null}
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> Delete filtered questions
          </button>
        </div>
        <button onClick={() => setEditing({ status: "published", difficulty: "medium", is_pyq: true, correct_answer: 0, tags: [] })}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add question
        </button>
      </div>

      {confirmBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !bulkDeleting && setConfirmBulk(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold">Delete questions?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You are about to delete {total.toLocaleString()} questions. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button disabled={bulkDeleting} onClick={() => setConfirmBulk(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40">Cancel</button>
              <button disabled={bulkDeleting} onClick={bulkDeleteFiltered} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-40">
                {bulkDeleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete {total.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}


      <p className="text-xs text-muted-foreground mb-2">
        CSV columns: <b>Subject</b>, <b>Sub Subject</b>, <b>Chapter</b>, <b>Question</b>, <b>Option A/B/C/D</b>, <b>Correct Answer</b> (0-3 or A-D), <b>Language</b>.
        Missing Subjects, Sub Subjects and Chapters are created automatically. Duplicate questions in the same chapter are skipped.
      </p>

      {importSummary && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">Import summary</p>
          <p className="text-muted-foreground mt-1">
            Imported: <b className="text-emerald-500">{importSummary.imported}</b> ·
            Skipped: <b className="text-amber-500"> {importSummary.skipped}</b> ·
            Failed: <b className="text-destructive"> {importSummary.failed}</b>
          </p>
          {importSummary.details.length > 0 && (
            <ul className="mt-2 text-xs text-muted-foreground space-y-0.5 max-h-40 overflow-auto">
              {importSummary.details.map((d, i) => <li key={i}>• {d}</li>)}
            </ul>
          )}
          <button onClick={() => setImportSummary(null)} className="mt-2 text-xs underline text-muted-foreground">Dismiss</button>
        </div>
      )}

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
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_pyq ?? true} onChange={(e) => setEditing({ ...editing, is_pyq: e.target.checked })} /> Previous Year Question</label>
              <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Language</span>
                <input className="input mt-1" value={editing.language ?? ""} onChange={(e) => setEditing({ ...editing, language: e.target.value })} placeholder="e.g. en, hi, sa" />
              </label>
            </div>
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

function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
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
