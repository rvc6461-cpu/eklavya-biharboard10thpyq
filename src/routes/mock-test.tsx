import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, FlaskConical, Timer } from "lucide-react";
import { SUBJECTS } from "@/lib/pyq/data";

export const Route = createFileRoute("/mock-test")({
  head: () => ({
    meta: [
      { title: "Mock Test · Eklavya" },
      { name: "description", content: "Full-length 100-question mock tests for Bihar Board Class 10." },
    ],
  }),
  component: MockTestIndex,
});

function MockTestIndex() {
  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-base font-bold">Mock Test</h1>
          <div className="w-10" />
        </header>

        <main className="space-y-6 px-5">
          <div className="bg-hero relative overflow-hidden rounded-3xl border border-white/5 p-5 shadow-card-premium">
            <div className="bg-emerald-500/30 absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <FlaskConical className="h-3 w-3 text-emerald-300" />
                <span className="text-[11px] font-semibold tracking-wide">100 Questions · Full Length</span>
              </div>
              <h2 className="font-display mt-3 text-xl font-bold leading-tight">
                Test your prep.<br />
                <span className="text-gradient-gold">Beat the clock.</span>
              </h2>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Timer className="h-3 w-3" /> Suggested time: 100 minutes
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-display text-base font-bold">Choose a subject</h3>
            {SUBJECTS.map((s) => {
              const total = s.chapters.reduce((n, c) => n + c.questions.length, 0);
              return (
                <Link
                  key={s.id}
                  to="/mock-test/$subject"
                  params={{ subject: s.id }}
                  className="bg-gradient-card flex items-center gap-4 rounded-2xl border border-border p-4"
                >
                  <div className={`bg-gradient-to-br ${s.hue} flex h-12 w-12 items-center justify-center rounded-2xl font-display text-xl font-bold text-white shadow-lg`}>
                    {s.glyph}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {Math.min(100, total)} questions · {total < 100 ? `only ${total} available` : "100 mixed PYQs"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
