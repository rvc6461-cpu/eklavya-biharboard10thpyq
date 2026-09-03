import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Clipboard, Gift, Link2, Share2, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { copyText, getReferralData, shareText, type ReferralHistoryItem } from "@/lib/phase4b";

export const Route = createFileRoute("/referral")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Refer & Earn · Eklavya" },
    { name: "description", content: "Invite classmates to Eklavya and unlock lifetime premium after ten verified referrals." },
    { property: "og:title", content: "Refer & Earn · Eklavya" },
    { property: "og:description", content: "Invite classmates and unlock lifetime premium." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ReferralPage,
});

function ReferralPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { profile } = useProfile(user);
  const [code, setCode] = useState("");
  const [link, setLink] = useState("");
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { next: "/referral" } });
  }, [loading, user, navigate]);
  useEffect(() => {
    if (!user) return;
    getReferralData(user.id).then((data) => {
      setCode(data.code); setLink(data.link); setHistory(data.history);
    }).catch(() => setNotice("Referral details are temporarily unavailable."));
  }, [user]);

  const verified = history.filter((item) => item.status === "verified").length;
  const progress = Math.min(10, verified);
  const unlocked = Boolean(profile?.is_premium);
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2200); };

  if (loading || !user) return <Loading />;
  return (
    <div className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-md">
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-display text-base font-bold">Refer & Earn</h1><div className="w-10" />
      </header>
      <main className="space-y-5 px-5">
        <section className="bg-hero relative overflow-hidden rounded-3xl border border-white/5 p-5 shadow-card-premium">
          <div className="relative"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20"><Gift className="h-6 w-6 text-gold" /></div>
            <h2 className="font-display mt-4 text-xl font-bold">Share Eklavya.<br /><span className="text-gradient-gold">Unlock Premium.</span></h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">10 verified classmates unlock lifetime access to handwritten notes, formula sheets and future premium content.</p>
          </div>
        </section>
        <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5">
          <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold tracking-wider text-gold uppercase">Referral progress</p><p className="mt-1 font-display text-2xl font-bold">{progress} <span className="text-sm text-muted-foreground">/ 10</span></p></div><Users className="h-5 w-5 text-gold" /></div>
          <div className="mt-4 grid grid-cols-10 gap-1">{Array.from({ length: 10 }, (_, i) => <div key={i} className={`h-2 rounded-full ${i < progress ? "bg-gold" : "bg-muted"}`} />)}</div>
          <p className="mt-3 text-xs text-muted-foreground">{unlocked ? "Lifetime Premium is unlocked." : `${10 - progress} more verified referral${10 - progress === 1 ? "" : "s"} to go.`}</p>
        </section>
        {unlocked && <section className="rounded-2xl border border-success/30 bg-success/10 p-4"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-success" /><div><p className="font-display text-sm font-bold">Congratulations!</p><p className="text-xs text-muted-foreground">You have unlocked Lifetime Premium.</p></div></div></section>}
        <section className="space-y-3">
          <div><p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Your referral code</p><div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-card p-3"><span className="font-display flex-1 text-lg font-bold tracking-[0.2em]">{code || "Loading…"}</span><button type="button" onClick={() => code && copyText(code).then(() => showNotice("Code copied"))} className="flex h-9 items-center gap-1.5 rounded-xl bg-primary/15 px-3 text-xs font-bold text-primary"><Clipboard className="h-4 w-4" /> Copy</button></div></div>
          <div><p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Your referral link</p><div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-card p-3"><span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{link || "Loading…"}</span><button type="button" onClick={() => link && copyText(link).then(() => showNotice("Link copied"))} className="flex h-9 items-center gap-1.5 rounded-xl bg-primary/15 px-3 text-xs font-bold text-primary"><Link2 className="h-4 w-4" /> Copy</button></div></div>
          <button type="button" disabled={!link} onClick={() => link && shareText("Join Eklavya", "Prepare smarter with Eklavya Bihar Board 10th PYQ.", link).then((native) => showNotice(native ? "Share sheet opened" : "Link copied"))} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><Share2 className="h-4 w-4" /> Share referral link</button>
        </section>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-base font-bold">Referral history</h2><span className="text-xs text-muted-foreground">{history.length} total</span></div>{history.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center"><p className="text-sm font-semibold">No referrals yet</p><p className="mt-1 text-xs text-muted-foreground">Your verified invites will appear here.</p></div> : <div className="space-y-2">{history.map((item) => <HistoryRow key={item.id} item={item} />)}</div>}</section>
        {notice && <p role="status" className="fixed right-5 bottom-5 left-5 z-50 mx-auto max-w-md rounded-xl bg-card px-4 py-3 text-center text-xs font-semibold shadow-lg">{notice}</p>}
      </main>
    </div></div>
  );
}

function HistoryRow({ item }: { item: ReferralHistoryItem }) {
  const label = item.status[0].toUpperCase() + item.status.slice(1);
  return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.status === "verified" ? "bg-success/15 text-success" : item.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-gold/15 text-gold"}`}>{item.status === "verified" ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">New student</p><p className="text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p></div><span className="text-xs font-bold">{label}</span></div>;
}

function Loading() { return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>; }