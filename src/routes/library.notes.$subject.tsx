import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSubjectById, type DbSubject } from "@/lib/pyq/db";
import { fetchResources, type LibraryResource } from "@/lib/pyq/library";
import { EmptyState, ResourceRow } from "@/components/library/ResourceRow";
import { useAuth, useProfile } from "@/hooks/useAuth";

export const Route = createFileRoute("/library/notes/$subject")({
  head: () => ({
    meta: [
      { title: "Subject Notes · Eklavya" },
      { name: "description", content: "Chapter-wise premium handwritten notes for this Bihar Board Class 10 subject." },
      { property: "og:title", content: "Subject Notes · Eklavya" },
      { property: "og:description", content: "Premium chapter-wise handwritten notes, unlocked with Eklavya Premium." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubjectNotes,
});

function SubjectNotes() {
  const { subject } = Route.useParams();
  const { user } = useAuth();
  const { profile } = useProfile(user);
  const [sub, setSub] = useState<DbSubject | null>(null);
  const [chapters, setChapters] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<LibraryResource[] | null>(null);

  useEffect(() => {
    fetchSubjectById(subject).then(setSub);
    supabase
      .from("chapters")
      .select("id,name")
      .eq("subject_id", subject)
      .order("sort_order")
      .then(({ data }) => setChapters((data ?? []) as { id: string; name: string }[]));
    fetchResources("premium_note").then((all) =>
      setRows(all.filter((r) => r.subject_id === subject)),
    );
  }, [subject]);

  const unlocked = !!profile?.is_premium;

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/library/notes" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">{sub?.name ?? "Notes"}</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-3 px-5">
          {rows === null ? (
            <p className="text-center text-xs text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <EmptyState text="No handwritten notes uploaded for this subject yet." />
          ) : (
            rows.map((r) => (
              <ResourceRow
                key={r.id}
                resource={r}
                locked={r.is_premium && !unlocked}
                label={chapters.find((c) => c.id === r.chapter_id)?.name ?? r.title}
              />
            ))
          )}
        </main>
      </div>
    </div>
  );
}
