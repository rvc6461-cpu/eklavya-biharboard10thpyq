import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Card } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  Users, UserCheck, BookOpen, Layers, ListChecks, ClipboardList, FileText, Activity,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard · Eklavya" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

type Stats = {
  users: number; active: number; subjects: number; chapters: number;
  questions: number; mocks: number; notes: number; attempts: number;
};

function AdminDashboard() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const count = async (table: string, filter?: (q: any) => any) => {
        let q: any = supabase.from(table as any).select("*", { count: "exact", head: true });
        if (filter) q = filter(q);
        const { count: c } = await q;
        return c ?? 0;
      };
      const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const [users, subjects, chapters, questions, mocks, notes, attempts, activeRes] = await Promise.all([
        count("profiles"),
        count("subjects"),
        count("chapters"),
        count("questions"),
        count("mock_test_templates"),
        count("notes"),
        count("attempts"),
        supabase.from("attempts").select("user_id").gte("updated_at", sevenDaysAgo).limit(10000),
      ]);
      const active = new Set((activeRes.data ?? []).map((r: any) => r.user_id)).size;
      setS({ users, active, subjects, chapters, questions, mocks, notes, attempts });
    })();
  }, []);

  const items = [
    { label: "Total Users", icon: Users, value: s?.users, color: "text-indigo-500" },
    { label: "Active (7d)", icon: UserCheck, value: s?.active, color: "text-emerald-500" },
    { label: "Subjects", icon: BookOpen, value: s?.subjects, color: "text-violet-500" },
    { label: "Chapters", icon: Layers, value: s?.chapters, color: "text-sky-500" },
    { label: "Questions", icon: ListChecks, value: s?.questions, color: "text-amber-500" },
    { label: "Mock Tests", icon: ClipboardList, value: s?.mocks, color: "text-rose-500" },
    { label: "Notes", icon: FileText, value: s?.notes, color: "text-teal-500" },
    { label: "Total Attempts", icon: Activity, value: s?.attempts, color: "text-orange-500" },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Card key={it.label}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{it.label}</p>
                <Icon className={`h-4 w-4 ${it.color}`} />
              </div>
              <p className="mt-3 font-display text-3xl font-bold">
                {it.value === undefined ? "—" : it.value.toLocaleString()}
              </p>
            </Card>
          );
        })}
      </div>
    </AdminShell>
  );
}
