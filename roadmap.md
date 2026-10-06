# Phase 4B Roadmap

- [x] Add secure referral, premium unlock, notification, feedback, and app-info backend schema.
- [x] Add protected referral/profile/preferences functions and client data helpers.
- [x] Add referral, notification, feedback, contact, about, settings, search, and premium screens.
- [x] Wire auth referral capture, profile premium badge, and home actions/navigation.
- [x] Fix hydration mismatch and verify public routes, signed-out guards, navigation, and runtime logs.

## Current fixes
- [x] Persist admin-managed exam date and show live countdown on home.
- [x] Persist admin-managed daily motivation quotes with date/active fallback.
- [x] Align homepage statistics with Analytics without loading-zero flashes.
- [x] Resume latest unfinished practice or mock session with saved state.
- [x] Add persisted Light/Dark appearance settings while preserving current dark theme.

## Premium purchase preparation
- [x] Add Google Play Billing-ready one-time Premium option without simulating a purchase.
- [x] Surface the option from existing locked Premium/handwritten-notes entry points.
- [x] Verify the preview clearly reports billing unavailable and never grants access.
- [ ] Connect a native Google Play Billing client and server-side purchase verification after the Android app and Play Console product are configured.
