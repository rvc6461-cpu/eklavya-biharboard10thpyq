import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Card } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Send, Clock, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Admin" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsAdmin,
});

type Notif = { id: string; title: string; body: string; scheduled_for: string | null; sent_at: string | null; created_at: string };

function NotificationsAdmin() {
  const [rows, setRows] = useState<Notif[] | null>(null);
  const [form, setForm] = useState({ title: "", body: "", scheduled_for: "" });

  const load = async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Notif[]);
  };
  useEffect(() => { load(); }, []);

  const send = async (mode: "now" | "schedule") => {
    if (!form.title || !form.body) { alert("Title and body required"); return; }
    const payload: any = { title: form.title, body: form.body };
    if (mode === "now") payload.sent_at = new Date().toISOString();
    else if (form.scheduled_for) payload.scheduled_for = new Date(form.scheduled_for).toISOString();
    else { alert("Pick a schedule time"); return; }
    await supabase.from("notifications").insert(payload);
    setForm({ title: "", body: "", scheduled_for: "" });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    await supabase.from("notifications").delete().eq("id", id);
    load();
  };

  return (
    <AdminShell title="Notifications">
      <div className="grid md:grid-cols-3 gap-5">
        <Card className="md:col-span-1 space-y-3">
          <h2 className="font-display font-bold">Compose</h2>
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input" placeholder="Message body" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <label className="block"><span className="text-xs uppercase font-semibold text-muted-foreground">Schedule (optional)</span>
            <input type="datetime-local" className="input mt-1" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <button onClick={() => send("now")} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
              <Send className="h-4 w-4" /> Send now
            </button>
            <button onClick={() => send("schedule")} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold">
              <Clock className="h-4 w-4" /> Schedule
            </button>
          </div>
        </Card>

        <Card className="md:col-span-2 !p-0 overflow-x-auto">
          {rows === null ? <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div> : (
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Title</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Time</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id} className="border-t border-border">
                    <td className="p-3"><p className="font-semibold">{n.title}</p><p className="text-xs text-muted-foreground line-clamp-1">{n.body}</p></td>
                    <td className="p-3">
                      {n.sent_at ? <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-600">Sent</span>
                        : n.scheduled_for ? <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-600">Scheduled</span>
                        : <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-muted">Draft</span>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{n.sent_at ? new Date(n.sent_at).toLocaleString() : n.scheduled_for ? new Date(n.scheduled_for).toLocaleString() : "—"}</td>
                    <td className="p-3 text-right"><button onClick={() => del(n.id)} className="p-1.5 hover:bg-muted rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No notifications.</td></tr>}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <style>{`.input{width:100%;border-radius:12px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none}`}</style>
    </AdminShell>
  );
}
