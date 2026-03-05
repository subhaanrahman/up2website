# API Integrations Checklist

Pre-launch checklist for third-party API integrations that need to be set up before going live.

## Pending

| API | Purpose | Status | Notes |
|-----|---------|--------|-------|
| Google Places API | City autocomplete in Edit Profile | ⏳ Pending | Currently using hardcoded city list (`src/data/cities.ts`). Need to set up Google Cloud project, enable Places API, create API key, add as backend secret `GOOGLE_PLACES_API_KEY`, and build a proxy edge function. |
| GIF API (Tenor / GIPHY) | GIF picker in Post Composer | ⏳ Pending | Tenor API reportedly being deprecated / no longer accepting new clients as of 2026. Investigate GIPHY SDK or alternative. Edge function `gif-search` and `GifPicker` component exist as placeholders. Need API key as backend secret `TENOR_API_KEY` or equivalent. |

## Completed

| API | Purpose | Status |
|-----|---------|--------|
| Stripe | Payment intents | ✅ Done |
