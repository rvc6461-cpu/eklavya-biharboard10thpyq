import { Link } from "@tanstack/react-router";
import { Check, Crown, Download, FileText, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { downloadResource, isDownloaded, type LibraryResource } from "@/lib/pyq/library";

export function LibraryHeaderCard({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="bg-gradient-card rounded-2xl border border-border p-4">
      <p className="font-display text-sm font-bold">{title}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export function ResourceRow({
  resource,
  label,
  locked = false,
}: {
  resource: LibraryResource;
  label: string;
  locked?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">(
    isDownloaded(resource.id) ? "done" : "idle",
  );

  const download = async () => {
    setState("loading");
    try {
      await downloadResource(resource);
      setState("done");
    } catch {
      setState("idle");
    }
  };

  return (
    <div className="bg-gradient-card flex items-center gap-3 rounded-2xl border border-border p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15">
        {locked ? (
          <Lock className="h-5 w-5 text-gold" strokeWidth={2.2} />
        ) : (
          <FileText className="h-5 w-5 text-sky-300" strokeWidth={2.2} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display truncate text-sm font-bold">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {resource.description || resource.title}
        </p>
      </div>
      {locked ? (
        <span className="inline-flex items-center gap-1 rounded-xl border border-gold/40 px-2.5 py-1.5 text-[11px] font-bold text-gold">
          <Crown className="h-3.5 w-3.5" /> Premium
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <Link
            to="/library/view/$id"
            params={{ id: resource.id }}
            className="rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-bold text-primary"
          >
            Open
          </Link>
          <button
            type="button"
            onClick={download}
            disabled={state !== "idle"}
            title={state === "done" ? "Downloaded" : state === "loading" ? "Downloading..." : "Download"}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground disabled:opacity-70"
          >
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : state === "done" ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-border bg-gradient-card p-8 text-center">
      <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
