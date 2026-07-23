import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Card } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics · Admin" }, { name: "robots", content: "noindex" }] }),
  component: AnalyticsAdmin,
});

type Attempt = { question_id: string; subject_id: string; is_correct: boolean; user_id: string; created_at: string };

function AnalyticsAdmin() {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [a, q, s] = await Promise.all([
        supabase.from("attempts").select("question_id,subject_id,is_correct,user_id,created_at").limit(20000),
        supabase.from("questions").select("id,text,difficulty"),
        supabase.from("subjects").select("id,name"),
      ]);
      setAttempts((a.data ?? []) as Attempt[]);
      setQuestions(q.data ?? []); setSubjects(s.data ?? []);
    })();
  }, []);

  const qMap = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);
  const sMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects]);

  const perQ = useMemo(() => {
    if (!attempts) return [];
    const map = new Map<string, { total: number; wrong: number }>();
    for (const a of attempts) {
      const cur = map.get(a.question_id) ?? { total: 0, wrong: 0 };
      cur.total += 1; if (!a.is_correct) cur.wrong += 1;
      map.set(a.question_id, cur);
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v, errorRate: v.wrong / v.total }));
  }, [attempts]);

  const hardest = [...perQ].filter((x) => x.total >= 3).sort((a, b) => b.errorRate - a.errorRate).slice(0, 10);
  const mostAttempted = [...perQ].sort((a, b) => b.total - a.total).slice(0, 10);

  const perSubject = useMemo(() => {
    if (!attempts) return [];
    const map = new Map<string, { total: number; correct: number }>();
    for (const a of attempts) {
      const cur = map.get(a.subject_id) ?? { total: 0, correct: 0 };
      cur.total += 1; if (a.is_correct) cur.correct += 1;
      map.set(a.subject_id, cur);
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      id, name: sMap[id] ?? "Unknown", total: v.total,
      accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [attempts, sMap]);

  const dau = useMemo(() => {
    if (!attempts) return [];
    const map = new Map<string, Set<string>>();
    for (const a of attempts) {
      const day = a.created_at.slice(0, 10);
      const set = map.get(day) ?? new Set();
      set.add(a.user_id); map.set(day, set);
    }
    return Array.from(map.entries()).map(([day, set]) => ({ day, users: set.size })).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
  }, [attempts]);

  if (attempts === null) {
    return <AdminShell title="Analytics"><div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div></AdminShell>;
  }

  const maxDau = Math.max(1, ...dau.map((d) => d.users));

  return (
    <AdminShell title="Analytics">
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-display font-bold mb-3">Most difficult questions</h3>
          <ul className="space-y-2 text-sm">
            {hardest.length === 0 && <li className="text-muted-foreground text-sm">Not enough data yet.</li>}
            {hardest.map((h) => (
              <li key={h.id} className="flex items-start gap-3 border-b border-border pb-2 last:border-0">
                <span className="rounded-lg bg-destructive/15 text-destructive px-2 py-0.5 text-xs font-bold">{Math.round(h.errorRate * 100)}% wrong</span>
                <span className="flex-1 line-clamp-2">{qMap[h.id]?.text ?? h.id}</span>
                <span className="text-xs text-muted-foreground">{h.total}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="font-display font-bold mb-3">Most attempted questions</h3>
          <ul className="space-y-2 text-sm">
            {mostAttempted.length === 0 && <li className="text-muted-foreground text-sm">No attempts yet.</li>}
            {mostAttempted.map((h) => (
              <li key={h.id} className="flex items-start gap-3 border-b border-border pb-2 last:border-0">
                <span className="rounded-lg bg-primary/15 text-primary px-2 py-0.5 text-xs font-bold">{h.total}×</span>
                <span className="flex-1 line-clamp-2">{qMap[h.id]?.text ?? h.id}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="font-display font-bold mb-3">Subject-wise performance</h3>
          <ul className="space-y-3 text-sm">
            {perSubject.map((s) => (
              <li key={s.id}>
                <div className="flex justify-between text-xs mb-1"><span className="font-semibold">{s.name}</span><span className="text-muted-foreground">{s.accuracy}% acc · {s.total} attempts</span></div>
                <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-primary" style={{ width: `${s.accuracy}%` }} /></div>
              </li>
            ))}
            {perSubject.length === 0 && <li className="text-muted-foreground">No attempts yet.</li>}
          </ul>
        </Card>

        <Card>
          <h3 className="font-display font-bold mb-3">Daily active users (last 14 days)</h3>
          {dau.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <div className="flex items-end gap-1 h-32">
              {dau.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-gradient-primary" style={{ height: `${(d.users / maxDau) * 100}%` }} title={`${d.day}: ${d.users}`} />
                  <span className="text-[9px] text-muted-foreground">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
