import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Card } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Shuffle, Check } from "lucide-react";

export const Route = createFileRoute("/admin/mock-tests")({
  head: () => ({ meta: [{ title: "Mock Tests · Admin" }, { name: "robots", content: "noindex" }] }),
  component: MockTestsAdmin,
});

type Template = {
  id: string; name: string; description: string | null; subject_id: string | null;
  time_limit_seconds: number; is_published: boolean; created_at: string;
};

function MockTestsAdmin() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [rows, setRows] = useState<Template[] | null>(null);
  const [editing, setEditing] = useState<Partial<Template> & { questionIds?: string[] } | null>(null);

  const load = async () => {
    const { data } = await supabase.from("mock_test_templates").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Template[]);
  };
  useEffect(() => {
    supabase.from("subjects").select("*").order("sort_order").then(({ data }) => setSubjects(data ?? []));
    load();
  }, []);

  const openEdit = async (t?: Template) => {
    if (t) {
      const { data } = await supabase.from("mock_test_questions").select("question_id,position").eq("template_id", t.id).order("position");
      setEditing({ ...t, questionIds: (data ?? []).map((r: any) => r.question_id) });
    } else {
      setEditing({ time_limit_seconds: 1800, is_published: false, questionIds: [] });
    }
  };

  const save = async () => {
    if (!editing?.name) { alert("Name required"); return; }
    const payload = {
      name: editing.name!, description: editing.description ?? null,
      subject_id: editing.subject_id ?? null,
      time_limit_seconds: editing.time_limit_seconds ?? 1800,
      is_published: editing.is_published ?? false,
    };
    let id = editing.id;
    if (id) await supabase.from("mock_test_templates").update(payload).eq("id", id);
    else {
      const { data } = await supabase.from("mock_test_templates").insert(payload).select("id").single();
      id = data?.id;
    }
    if (id) {
      await supabase.from("mock_test_questions").delete().eq("template_id", id);
      const qids = editing.questionIds ?? [];
      if (qids.length) {
        await supabase.from("mock_test_questions").insert(qids.map((qid, i) => ({ template_id: id!, question_id: qid, position: i })));
      }
    }
    setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this mock test?")) return;
    await supabase.from("mock_test_templates").delete().eq("id", id);
    load();
  };

  return (
    <AdminShell title="Mock Tests">
      <div className="mb-4 flex justify-end">
        <button onClick={() => openEdit()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Create mock test
        </button>
      </div>
      <Card className="!p-0 overflow-x-auto">
        {rows === null ? <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div> : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Time</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{r.name}<br /><span className="text-xs text-muted-foreground font-normal">{r.description}</span></td>
                  <td className="p-3 text-muted-foreground">{subjects.find((s) => s.id === r.subject_id)?.name ?? "All"}</td>
                  <td className="p-3">{Math.round(r.time_limit_seconds / 60)} min</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.is_published ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{r.is_published ? "Published" : "Draft"}</span></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(r.id)} className="p-1.5 hover:bg-muted rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No mock tests yet.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

      {editing && <MockEditor editing={editing} setEditing={setEditing} subjects={subjects} save={save} />}
      <style>{`.input{width:100%;border-radius:12px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none}`}</style>
    </AdminShell>
  );
}

function MockEditor({ editing, setEditing, subjects, save }: any) {
  const [available, setAvailable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q: any = supabase.from("questions").select("id,text,difficulty,subject_id,chapter_id").eq("status", "published").limit(500);
      if (editing.subject_id) q = q.eq("subject_id", editing.subject_id);
      const { data } = await q;
      setAvailable(data ?? []); setLoading(false);
    })();
  }, [editing.subject_id]);

  const selected = new Set(editing.questionIds ?? []);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setEditing({ ...editing, questionIds: Array.from(next) });
  };
  const randomize = (n: number) => {
    const pool = [...available].sort(() => Math.random() - 0.5).slice(0, n).map((q) => q.id);
    setEditing({ ...editing, questionIds: pool });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={() => setEditing(null)}>
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-card border border-border p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-lg">{editing.id ? "Edit mock test" : "New mock test"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block col-span-2"><span className="text-xs uppercase font-semibold text-muted-foreground">Name</span>
            <input className="input mt-1" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label className="block col-span-2"><span className="text-xs uppercase font-semibold text-muted-foreground">Description</span>
            <input className="input mt-1" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </label>
          <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Subject (optional)</span>
            <select className="input mt-1" value={editing.subject_id ?? ""} onChange={(e) => setEditing({ ...editing, subject_id: e.target.value || null, questionIds: [] })}>
              <option value="">All subjects</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Time limit (minutes)</span>
            <input type="number" className="input mt-1" value={Math.round((editing.time_limit_seconds ?? 1800) / 60)} onChange={(e) => setEditing({ ...editing, time_limit_seconds: Number(e.target.value) * 60 })} />
          </label>
          <label className="flex items-center gap-2 text-sm col-span-2"><input type="checkbox" checked={editing.is_published ?? false} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} /> Publish (make visible to students)</label>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm font-semibold">Questions <span className="text-muted-foreground font-normal">({(editing.questionIds ?? []).length} selected)</span></p>
          <div className="flex gap-2">
            {[10, 20, 30].map((n) => (
              <button key={n} onClick={() => randomize(n)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-xs font-semibold hover:bg-muted">
                <Shuffle className="h-3 w-3" /> Random {n}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
          {loading ? <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div> :
            available.map((q) => (
              <button key={q.id} onClick={() => toggle(q.id)} className="flex w-full items-center gap-3 p-3 border-b border-border text-left hover:bg-muted">
                <span className={`h-5 w-5 rounded-md border flex items-center justify-center ${selected.has(q.id) ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                  {selected.has(q.id) && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1 text-sm line-clamp-2">{q.text}</span>
                <span className="text-xs text-muted-foreground capitalize">{q.difficulty}</span>
              </button>
            ))}
          {!loading && available.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No published questions available.</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl border border-border text-sm">Cancel</button>
          <button onClick={save} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
}
