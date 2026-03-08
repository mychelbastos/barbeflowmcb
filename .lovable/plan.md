

# Tracking Completo: UTM Multi-Touch + Meta CAPI + GA4

## Overview

Replace the fragmented `src/utils/metaTracking.ts` + `src/utils/consent.ts` setup with a unified `src/lib/tracking.ts` module that handles UTMs, visitor sessions, Meta Pixel+CAPI (with consent), and GA4. Backend is ready: `visitor_sessions` table, `record_visitor_session` RPC, `link_visitor_attribution` RPC.

---

## Files to Create

### 1. `src/lib/tracking.ts`
Unified tracking module with:
- **Visitor ID**: `getOrCreateVisitorId()` — generates/persists `vis_*` ID in localStorage.
- **UTM capture**: Reads from URL params, persists in sessionStorage, falls back gracefully.
- **Cookie helpers**: `getFbp()`, `getFbc()` (creates `_fbc` cookie from fbclid if needed).
- **Session recording**: `initTracking()` calls `record_visitor_session` RPC on first visit or when UTMs present. Uses direct REST call (`/rest/v1/rpc/record_visitor_session`) with anon key (no auth needed — RPC is SECURITY DEFINER).
- **Unified `trackEvent()`**: Fires Meta Pixel (if consent granted), Meta CAPI (always, server-side), and GA4 simultaneously. All share the same `event_id` for dedup.
- **Consent-aware**: Pixel only fires if `hasMarketingConsent()`. CAPI fires regardless (server-side, no cookie dependency). GA4 fires regardless.
- **Public API exports**: `initTracking()`, `trackPageView()`, `trackViewContent()`, `trackCompleteRegistration()`, `trackInitiateCheckout()`, `trackStartTrial()`, `trackPurchase()`, `trackLead()`, `getVisitorId()`, `getTrackingData()`.
- Constants: `PIXEL_ID = '1215198763828492'` (from existing consent.ts), `GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'` (placeholder — user will replace).

### 2. `src/types/tracking.d.ts`
Window interface augmentation for `fbq`, `gtag`, `dataLayer`.

---

## Files to Modify

### 3. `index.html`
- Keep existing Meta Pixel loader (deferred, consent revoked by default) — already correct.
- Add GA4 script tags in `<head>`: async gtag.js loader + `gtag('config', 'G-XXXXXXXXXX', { send_page_view: false })`.
- Update noscript pixel img to keep existing pixel ID.

### 4. `src/App.tsx`
- Replace `persistFbclid` import with `initTracking` from `@/lib/tracking`.
- Add `trackPageView` on route changes via a new `TrackingProvider` component inside `<BrowserRouter>` that uses `useLocation` to fire `trackPageView()` on every pathname change.
- Keep `checkConsentOnLoad()` call.

### 5. `src/pages/Login.tsx`
- Replace `trackEvent` import from `@/utils/metaTracking` with `trackCompleteRegistration`, `getTrackingData` from `@/lib/tracking`.
- On signup success: call `trackCompleteRegistration()` with email, phone, external_id.
- Pass `visitor_id`, `meta_fbp`, `meta_fbc` in signup metadata.
- After signup, call `link_visitor_attribution` RPC (with 2s delay for trigger to create tenant).

### 6. `src/pages/Onboarding.tsx`
- Replace old `trackEvent` / `getFbp` / `getPersistedFbc` imports with `trackViewContent`, `trackInitiateCheckout` from `@/lib/tracking`.
- Remove manual `saveMeta` effect (attribution already linked at signup).
- Use `trackViewContent('pricing_page')` on mount.
- Use `trackInitiateCheckout(selectedPlan, totalPrice)` before Stripe redirect.

### 7. `src/pages/Landing.tsx`
- Replace `trackEvent` import with `trackViewContent` from `@/lib/tracking`.

### 8. `src/components/ContactForm.tsx`
- Replace `trackEvent` import with `trackLead` from `@/lib/tracking`.

### 9. `src/utils/consent.ts`
- Keep as-is for consent logic. `initializePixel()` still handles `fbq('consent', 'grant')` + `fbq('init', PIXEL_ID)`.
- Remove the auto `fbq('track', 'PageView')` from `initializePixel()` — SPA page views are now controlled by `trackPageView()`.

### 10. `src/utils/metaTracking.ts`
- Keep file but mark exports as deprecated re-exports from `@/lib/tracking` for backward compatibility, or simply delete and update all imports. Cleaner to delete since only 5 files reference it.

---

## Technical Notes

- **Consent**: Meta Pixel respects cookie consent via `hasMarketingConsent()`. CAPI is server-side and doesn't require browser consent (it's first-party data processing). GA4 fires always (analytics consent is separate from marketing).
- **Dedup**: Pixel and CAPI share the same `event_id` per event, so Meta deduplicates automatically.
- **Session recording**: Uses anon key REST call (no auth required). The RPC is `SECURITY DEFINER` so it bypasses RLS.
- **Attribution linking**: At signup, `link_visitor_attribution(tenant_id, visitor_id)` computes first_touch/last_touch/all_touches and saves to `tenants.attribution`.
- **GA4 ID**: Will be set as `'G-XXXXXXXXXX'` placeholder — user configures in GA4 admin and replaces.
- **Non-blocking**: All tracking calls are fire-and-forget with try/catch, never blocking UX.

