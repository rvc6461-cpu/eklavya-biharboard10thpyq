import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Eklavya" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminGate,
});

function AdminGate() {
  const { isAdmin, loading, user } = useIsAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center space-y-3">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-xl font-bold">Sign in required</h1>
          <p className="text-sm text-muted-foreground">The admin panel is only accessible after signing in with an admin account.</p>
          <Link to="/auth" className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Go to sign in</Link>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center space-y-3">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="font-display text-xl font-bold">Access denied</h1>
          <p className="text-sm text-muted-foreground">Your account doesn't have admin permissions.</p>
          <Link to="/" className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Back to app</Link>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
