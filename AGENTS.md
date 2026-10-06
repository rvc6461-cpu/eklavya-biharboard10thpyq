# Architecture decisions

- Google Play Billing is exposed through a typed client bridge, but client purchase callbacks never grant entitlement; Premium must remain based on server-verified purchase records because browser/native responses can be forged.