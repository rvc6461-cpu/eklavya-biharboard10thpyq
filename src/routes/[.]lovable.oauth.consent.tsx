import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; redirect_uri?: string };
type AuthDetails = { client?: OAuthClient; scope?: string; redirect_url?: string; redirect_to?: string };
type OAuthResult = { data: AuthDetails | null; error: { message: string } | null };
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
function oauth(): OAuthNs {
  return (supabase.auth as unknown as { oauth: OAuthNs }).oauth;
}

type ConsentSearch = { authorization_id: string };

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): ConsentSearch => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center text-sm text-muted-foreground">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
        <h1 className="text-lg font-semibold text-foreground">
          Connect {clientName} to your Eklavya account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This lets {clientName} use Eklavya's MCP tools as you. It does not
          bypass Eklavya's permissions or backend policies.
        </p>
        {details?.scope && (
          <p className="mt-3 text-xs text-muted-foreground">
            Requested scopes: <span className="font-mono">{details.scope}</span>
          </p>
        )}
        {error && (
          <p className="mt-3 text-xs text-destructive" role="alert">{error}</p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Working…" : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}
