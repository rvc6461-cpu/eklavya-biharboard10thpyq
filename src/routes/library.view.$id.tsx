import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Crown, Download, Loader2, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  downloadResource,
  fetchResourceById,
  isDownloaded,
  signedUrl,
  type LibraryResource,
} from "@/lib/pyq/library";
import { useAuth, useProfile } from "@/hooks/useAuth";

export const Route = createFileRoute("/library/view/$id")({
  head: () => ({
    meta: [
      { title: "PDF Viewer · Eklavya" },
      { name: "description", content: "Read Bihar Board Class 10 study PDFs inside the Eklavya app with zoom support." },
      { property: "og:title", content: "PDF Viewer · Eklavya" },
      { property: "og:description", content: "In-app PDF reader for previous year papers, formula sheets and handwritten notes." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ViewerPage,
});

function ViewerPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { profile } = useProfile(user);
  const [res, setRes] = useState<LibraryResource | null | undefined>(undefined);
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [dl, setDl] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    fetchResourceById(id).then(async (r) => {
      setRes(r);
      if (r) {
        setDl(isDownloaded(r.id) ? "done" : "idle");
        setUrl(await signedUrl(r.pdf_url));
      }
    });
  }, [id]);

  const locked = !!res?.is_premium && !profile?.is_premium;

  const download = async () => {
    if (!res) return;
    setDl("loading");
    try {
      await downloadResource(res);
      setDl("done");
    } catch {
      setDl("idle");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <Link to="/library" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="font-display mx-3 flex-1 truncate text-center text-sm font-bold">
          {res?.title ?? "PDF"}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 25))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-[11px] font-bold text-muted-foreground">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(300, z + 25))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={download}
            disabled={locked || dl !== "idle"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border disabled:opacity-50"
            aria-label="Download"
          >
            {dl === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : dl === "done" ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      <div className="flex-1">
        {res === undefined ? (
          <div className="flex h-[80vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : res === null ? (
          <p className="p-8 text-center text-xs text-muted-foreground">This PDF is no longer available.</p>
        ) : locked ? (
          <div className="mx-auto mt-10 max-w-md px-5">
            <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-amber-500/20 via-card to-card p-6 text-center">
              <div className="bg-gradient-gold shadow-gold mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
                <Crown className="h-7 w-7 text-gold-foreground" strokeWidth={2.4} />
              </div>
              <p className="font-display mt-3 text-base font-bold">Premium Notes</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Unlock Eklavya Premium to read handwritten notes.
              </p>
            </div>
          </div>
        ) : url ? (
          <iframe
            key={`${url}-${zoom}`}
            src={`${url}#zoom=${zoom}&toolbar=0`}
            title={res.title}
            className="h-[calc(100vh-64px)] w-full border-0"
          />
        ) : (
          <p className="p-8 text-center text-xs text-muted-foreground">Unable to load this PDF.</p>
        )}
      </div>
    </div>
  );
}
