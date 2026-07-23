import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Card } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Upload, Trash2, Loader2, Crown, Download, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/notes")({
  head: () => ({ meta: [{ title: "Notes · Admin" }, { name: "robots", content: "noindex" }] }),
  component: NotesAdmin,
});

type Note = {
  id: string; title: string; description: string | null; subject_id: string | null;
  chapter_id: string | null; pdf_url: string; is_premium: boolean; is_published: boolean;
  download_count: number; created_at: string;
};

function NotesAdmin() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [rows, setRows] = useState<Note[] | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", subject_id: "", chapter_id: "",
    is_premium: false, is_published: true, file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("notes").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Note[]);
  };
  useEffect(() => {
    supabase.from("subjects").select("*").order("sort_order").then(({ data }) => setSubjects(data ?? []));
    supabase.from("chapters").select("*").order("sort_order").then(({ data }) => setChapters(data ?? []));
    load();
  }, []);

  const upload = async () => {
    if (!form.file || !form.title) { alert("Title and PDF file required"); return; }
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${form.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("notes").upload(path, form.file, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      await supabase.from("notes").insert({
        title: form.title, description: form.description || null,
        subject_id: form.subject_id || null, chapter_id: form.chapter_id || null,
        pdf_url: path, is_premium: form.is_premium, is_published: form.is_published,
      });
      setForm({ title: "", description: "", subject_id: "", chapter_id: "", is_premium: false, is_published: true, file: null });
      load();
    } catch (e: any) { alert("Upload failed: " + e.message); }
    finally { setUploading(false); }
  };

  const del = async (n: Note) => {
    if (!confirm("Delete this note?")) return;
    await supabase.storage.from("notes").remove([n.pdf_url]);
    await supabase.from("notes").delete().eq("id", n.id);
    load();
  };

  const view = async (path: string) => {
    const { data } = await supabase.storage.from("notes").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <AdminShell title="Notes">
      <div className="grid md:grid-cols-3 gap-5">
        <Card className="md:col-span-1 space-y-3">
          <h2 className="font-display font-bold">Upload PDF</h2>
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input" placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="input" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value, chapter_id: "" })}>
            <option value="">Subject (optional)</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={form.chapter_id} onChange={(e) => setForm({ ...form, chapter_id: e.target.value })} disabled={!form.subject_id}>
            <option value="">Chapter (optional)</option>
            {chapters.filter((c) => c.subject_id === form.subject_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })} /> Premium (paid users only)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published</label>
          <label className="block">
            <span className="text-xs uppercase font-semibold text-muted-foreground">PDF file</span>
            <input type="file" accept="application/pdf" className="block mt-1 text-sm" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
          </label>
          <button onClick={upload} disabled={uploading} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? "Uploading…" : "Upload note"}
          </button>
        </Card>

        <Card className="md:col-span-2 !p-0 overflow-x-auto">
          {rows === null ? <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div> : (
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Title</th><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Type</th><th className="p-3 text-left"><Download className="h-3 w-3 inline" /></th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id} className="border-t border-border">
                    <td className="p-3 font-semibold">{n.title}</td>
                    <td className="p-3 text-muted-foreground">{subjects.find((s) => s.id === n.subject_id)?.name ?? "—"}</td>
                    <td className="p-3">{n.is_premium ? <span className="inline-flex items-center gap-1 text-gold text-xs font-bold"><Crown className="h-3 w-3" /> Premium</span> : <span className="text-xs text-muted-foreground">Free</span>}</td>
                    <td className="p-3 text-xs">{n.download_count}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => view(n.pdf_url)} className="p-1.5 hover:bg-muted rounded-lg"><ExternalLink className="h-4 w-4" /></button>
                      <button onClick={() => del(n)} className="p-1.5 hover:bg-muted rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No notes uploaded.</td></tr>}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <style>{`.input{width:100%;border-radius:12px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none}`}</style>
    </AdminShell>
  );
}
