import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Card } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/sub-subjects")({
  head: () => ({ meta: [{ title: "Sub Subjects · Admin" }, { name: "robots", content: "noindex" }] }),
  component: SubSubjectsAdmin,
});

type SubSubject = {
  id: string;
  subject_id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};
type Subject = { id: string; name: string; slug: string };

function SubSubjectsAdmin() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rows, setRows] = useState<SubSubject[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Partial<SubSubject> | null>(null);

  const load = async () => {
    const [subs, ss] = await Promise.all([
      supabase.from("subjects").select("id,name,slug").order("sort_order"),
      supabase.from("sub_subjects").select("*").order("sort_order"),
    ]);
    setSubjects((subs.data ?? []) as Subject[]);
    setRows((ss.data ?? []) as SubSubject[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name || !editing?.slug || !editing?.subject_id) {
      alert("Subject, name and slug are required.");
      return;
    }
    const payload = {
      subject_id: editing.subject_id!,
      slug: editing.slug!,
      name: editing.name!,
      sort_order: editing.sort_order ?? 0,
      is_active: editing.is_active ?? true,
    };
    if (editing.id) await supabase.from("sub_subjects").update(payload).eq("id", editing.id);
    else await supabase.from("sub_subjects").insert(payload);
    setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this sub subject? Chapters will remain but lose this grouping.")) return;
    await supabase.from("sub_subjects").delete().eq("id", id);
    load();
  };

  const filtered = (rows ?? []).filter((r) => filter === "all" || r.subject_id === filter);
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";

  return (
    <AdminShell title="Sub Subjects">
      <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
        <select className="input max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button
          onClick={() => setEditing({ subject_id: filter === "all" ? subjects[0]?.id : filter })}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add sub subject
        </button>
      </div>
      <Card className="!p-0 overflow-x-auto">
        {rows === null ? (
          <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Order</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Subject</th>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.sort_order}</td>
                  <td className="p-3 font-semibold">{r.name}</td>
                  <td className="p-3 text-muted-foreground">{subjName(r.subject_id)}</td>
                  <td className="p-3 text-muted-foreground">{r.slug}</td>
                  <td className="p-3">{r.is_active ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => setEditing(r)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(r.id)} className="p-1.5 hover:bg-muted rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No sub subjects.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-bold text-lg">{editing.id ? "Edit sub subject" : "Add sub subject"}</h2>
            <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Subject</span>
              <select className="input mt-1" value={editing.subject_id ?? ""} onChange={(e) => setEditing({ ...editing, subject_id: e.target.value })}>
                <option value="">Select</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Name</span>
              <input className="input mt-1" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Slug</span>
              <input className="input mt-1" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
            </label>
            <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Sort order</span>
              <input type="number" className="input mt-1" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
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
