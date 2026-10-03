import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Card } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { CalendarDays, Edit3, Plus, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/content")({
  head: () => ({ meta: [{ title: "Exam & Motivation · Admin" }, { name: "robots", content: "noindex" }] }),
  component: ContentAdmin,
});

type Quote = { id: string; quote_text: string; quote_date: string | null; is_active: boolean };

function ContentAdmin() {
  const [examDate, setExamDate] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quote, setQuote] = useState({ id: "", quote_text: "", quote_date: "", is_active: true });
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const [{ data: setting }, { data: rows }] = await Promise.all([
      supabase.from("app_settings").select("exam_date").eq("key", "exam").maybeSingle(),
      supabase.from("motivation_quotes").select("id,quote_text,quote_date,is_active").order("created_at", { ascending: false }),
    ]);
    setExamDate(setting?.exam_date ?? "");
    setQuotes((rows ?? []) as Quote[]);
  };
  useEffect(() => { void load(); }, []);

  const saveExam = async () => {
    await supabase.from("app_settings").upsert({ key: "exam", exam_date: examDate }, { onConflict: "key" });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const saveQuote = async () => {
    if (!quote.quote_text.trim()) return;
    const payload = { quote_text: quote.quote_text.trim(), quote_date: quote.quote_date || null, is_active: quote.is_active };
    if (quote.id) await supabase.from("motivation_quotes").update(payload).eq("id", quote.id);
    else await supabase.from("motivation_quotes").insert(payload);
    setQuote({ id: "", quote_text: "", quote_date: "", is_active: true });
    await load();
  };

  return (
    <AdminShell title="Exam & Motivation">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-4">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-display font-bold">Exam date</h2></div>
          <p className="text-xs text-muted-foreground">This date powers the countdown shown to every learner.</p>
          <input type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          <button onClick={() => void saveExam()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"><Save className="h-4 w-4" /> Save exam date</button>
          {saved && <p className="text-xs font-semibold text-success">Exam date saved.</p>}
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between"><div><h2 className="font-display font-bold">Daily motivation</h2><p className="text-xs text-muted-foreground">Assign a date or leave it open for random active rotation.</p></div><button onClick={() => setQuote({ id: "", quote_text: "", quote_date: "", is_active: true })} className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold"><Plus className="h-4 w-4" /> New quote</button></div>
          <textarea className="input" rows={3} placeholder="Write a motivating quote" value={quote.quote_text} onChange={(e) => setQuote({ ...quote, quote_text: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-muted-foreground">Specific date<input type="date" className="input mt-1" value={quote.quote_date} onChange={(e) => setQuote({ ...quote, quote_date: e.target.value })} /></label><label className="flex items-center gap-2 self-end text-sm font-semibold"><input type="checkbox" checked={quote.is_active} onChange={(e) => setQuote({ ...quote, is_active: e.target.checked })} /> Active</label></div>
          <button onClick={() => void saveQuote()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Save className="h-4 w-4" /> {quote.id ? "Update quote" : "Add quote"}</button>
          <div className="divide-y divide-border rounded-xl border border-border">{quotes.map((row) => <div key={row.id} className="flex items-start gap-3 p-3"><div className="min-w-0 flex-1"><p className="text-sm">{row.quote_text}</p><p className="mt-1 text-[11px] text-muted-foreground">{row.quote_date ?? "Random active"} · {row.is_active ? "Active" : "Inactive"}</p></div><button aria-label="Edit quote" onClick={() => setQuote({ ...row, quote_date: row.quote_date ?? "" })} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Edit3 className="h-4 w-4" /></button><button aria-label="Delete quote" onClick={() => { if (confirm("Delete this quote?")) void supabase.from("motivation_quotes").delete().eq("id", row.id).then(load); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button></div>)}{quotes.length === 0 && <p className="p-4 text-sm text-muted-foreground">No motivation quotes yet.</p>}</div>
        </Card>
      </div>
      <style>{`.input{width:100%;border-radius:12px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none}`}</style>
    </AdminShell>
  );
}