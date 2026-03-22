# Twilio SMS OTP (Edge Functions)

The app sends and verifies phone OTPs through **Edge Functions** (`send-otp`, `verify-otp`), not through Supabase Auth’s built-in SMS UI alone.

## Critical: Auth dashboard ≠ Edge runtime

If you see **`SMS service not configured`** (HTTP 500, `code: TWILIO_NOT_CONFIGURED`), the Edge functions **do not** read Twilio settings from **Authentication → Providers → Phone**. That UI only affects Supabase Auth’s **built-in** phone flow. This codebase calls **`send-otp` / `verify-otp`** instead, which need the secrets below on the **Edge Functions** runtime.

## What to set

In **Supabase Dashboard → Project Settings → Edge Functions → Secrets**, add:

| Secret | Source |
|--------|--------|
| `TWILIO_ACCOUNT_SID` | Twilio Console |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify → your Service SID (`VA...`) |

Then **redeploy** the functions that use them:

```bash
supabase functions deploy send-otp verify-otp --project-ref <YOUR_PROJECT_REF>
```

## Common mistake

Configuring **Auth → Providers → Phone → Twilio** in the dashboard does **not** inject these variables into Edge Functions. You still need the three secrets above on the Edge runtime.

## Verify

After deploy, `send-otp` should return 200 (not `500` with `SMS service not configured`). When secrets are missing, the function returns a **single long `error` string** (the Supabase client often receives only `error` + `request_id`, not extra JSON fields—see `TWILIO_NOT_CONFIGURED_MESSAGE` in `_shared/twilio-config-message.ts`).
