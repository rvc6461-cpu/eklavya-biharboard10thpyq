import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Card } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/subjects")({
  head: () => ({ meta: [{ title: "Subjects · Admin" }, { name: "robots", content: "noindex" }] }),
  component: SubjectsAdmin,
});

type Subject = {
  id: string; slug: string; name: string; short: string; glyph: string;
  hue: string; sort_order: number; is_active: boolean;
};

const HUES = [
  "from-indigo-500 to-violet-600","from-emerald-500 to-teal-600","from-amber-500 to-orange-600",
  "from-sky-500 to-blue-600","from-rose-500 to-pink-600","from-yellow-500 to-orange-600",
];

function SubjectsAdmin() {
  const [rows, setRows] = useState<Subject[] | null>(null);
  const [editing, setEditing] = useState<Partial<Subject> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("subjects").select("*").order("sort_order");
    setRows((data ?? []) as Subject[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name || !editing?.slug) return;
    setSaving(true);
    const payload = {
      slug: editing.slug!, name: editing.name!, short: editing.short ?? editing.name!.slice(0,4),
      glyph: editing.glyph ?? "★", hue: editing.hue ?? HUES[0],
      sort_order: editing.sort_order ?? 0, is_active: editing.is_active ?? true,
    };
    if (editing.id) {
      await supabase.from("subjects").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("subjects").insert(payload);
    }
    setSaving(false); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this subject and all its chapters/questions?")) return;
    await supabase.from("subjects").delete().eq("id", id);
    load();
  };

  return (
    <AdminShell title="Subjects">
      <div className="mb-4 flex justify-end">
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add subject
        </button>
      </div>
      <Card className="!p-0 overflow-hidden">
        {rows === null ? (
          <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">Order</th><th className="p-3 text-left">Icon</th><th className="p-3 text-left">Name</th><th className="p-3 text-left">Slug</th><th className="p-3 text-left">Color</th><th className="p-3 text-left">Active</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.sort_order}</td>
                  <td className="p-3"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${r.hue} text-white font-bold`}>{r.glyph}</span></td>
                  <td className="p-3 font-semibold">{r.name} <span className="text-muted-foreground font-normal">({r.short})</span></td>
                  <td className="p-3 text-muted-foreground">{r.slug}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.hue}</td>
                  <td className="p-3">{r.is_active ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => setEditing(r)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(r.id)} className="p-1.5 hover:bg-muted rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No subjects yet.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-bold text-lg">{editing.id ? "Edit subject" : "Add subject"}</h2>
            <Field label="Name"><input className="input" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Short label"><input className="input" value={editing.short ?? ""} onChange={(e) => setEditing({ ...editing, short: e.target.value })} /></Field>
            <Field label="Slug (URL id)"><input className="input" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-") })} /></Field>
            <Field label="Icon (single character/emoji)"><input className="input" value={editing.glyph ?? ""} onChange={(e) => setEditing({ ...editing, glyph: e.target.value })} /></Field>
            <Field label="Color gradient">
              <select className="input" value={editing.hue ?? HUES[0]} onChange={(e) => setEditing({ ...editing, hue: e.target.value })}>
                {HUES.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="Sort order"><input type="number" className="input" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl border border-border text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;border-radius:12px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span><div className="mt-1">{children}</div></label>;
}
