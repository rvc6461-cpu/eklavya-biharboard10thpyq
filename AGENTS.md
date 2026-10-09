# Architecture decisions

- Google Play Billing is exposed through a typed client bridge, but client purchase callbacks never grant entitlement; Premium must remain based on server-verified purchase records because browser/native responses can be forged.
- Active-device enforcement is pinned to Supabase Auth session IDs and checked by database RLS plus authenticated server-function middleware, so stale devices cannot access personal data after another login.