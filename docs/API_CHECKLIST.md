# API Integrations Checklist

> Pre-launch checklist for third-party API integrations that need to be set up before going live.  
> Last updated: 2026-03-13

## Pending

| API | Purpose | Status | Notes |
|-----|---------|--------|-------|
| Google Places API | City autocomplete in Edit Profile | ⏳ Pending | Currently using hardcoded city list (`src/data/cities.ts`). Need to set up Google Cloud project, enable Places API, create API key, add as backend secret `GOOGLE_PLACES_API_KEY`, and build a proxy edge function. |
| GIF API (GIPHY) | GIF picker in Post Composer | ⏳ Pending | Tenor API deprecated / no longer accepting new clients as of 2026. GIPHY is the preferred alternative. Edge function `gif-search` and `GifPicker` component exist as placeholders. Need API key as backend secret. |
| Twilio Verify Email Channel | Email OTP verification | ⏳ Pending | Requirement: Enable the **email channel** in Twilio Verify Service (Twilio Console → Verify → your service → Email Integration). Twilio requires a **SendGrid integration** or approved email sender configured there. Without this, `email-verify-send` edge function will fail with a channel-not-enabled error. |
| Push Notifications (FCM/APNs) | Mobile push notifications | ⏳ Future | `notification_settings` table has `push_notifications` toggle but no push infrastructure exists. Would need Firebase Cloud Messaging or similar. |

## Completed

| API | Purpose | Status |
|-----|---------|--------|
| Stripe Payments | Payment intents, destination charges | ✅ Done |
| Stripe Connect | Organiser payouts (Express accounts) | ✅ Done |
| Twilio Verify (SMS) | Phone OTP verification | ✅ Done |
| Supabase Auth | User authentication | ✅ Done |
| Supabase Storage | File uploads (avatars, images, flyers) | ✅ Done |
| Supabase Realtime | Live feed, notifications, event chat, points | ✅ Done |

## Pre-Launch Requirements

| Item | Status | Notes |
|------|--------|-------|
| Replace Stripe test publishable key | ⏳ Pending | Currently hardcoded `pk_test_PLACEHOLDER` in `src/lib/stripe.ts` — must be `VITE_STRIPE_PUBLISHABLE_KEY` env var |
| Verify `STRIPE_WEBHOOK_SECRET` | ⏳ Pending | Create webhook endpoint in Stripe dashboard, confirm signing secret matches |
| Test end-to-end payment flow | ⏳ Pending | Full test with Stripe test mode |
| Configure CORS for production domain | ⏳ Pending | Edge functions use `*` wildcard — should restrict to production domain |
