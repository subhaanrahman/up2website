import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { toE164 } from "../_shared/phone.ts";
import { TWILIO_NOT_CONFIGURED_MESSAGE } from "../_shared/twilio-config-message.ts";
import "../_shared/job-handlers.ts";
import { enqueueAuthMomLogin } from "../_shared/mom-auth-events.ts";
import {
  phoneLocalIdentityVariants,
  redactEmailForLog,
} from "../_shared/phone-local-identity.ts";

/** Bump when session logic changes; appears in logs + client body so deploys are provable. */
const VERIFY_OTP_INTEROP_VERSION = "20260321-v4-linkUserGate";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const supabaseAnon = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

/** PostgREST may return uuid as string or other serializations */
function parseRpcUuid(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

/** Logged on session failure (never expose raw emails to clients). */
type OtpSessionFailureDiag = {
  interopVersion: string;
  candidatesTried: number;
  rpcEmailPresent: boolean;
  rpcEmailError: string | null;
  lastGenerateLinkError: string | null;
  lastVerifyOtpError: string | null;
  lastVerifyOtpStage: "email" | "magiclink" | null;
  lastCandidateRedacted: string | null;
  hadSessionUserMismatch: boolean;
  /** `user.id` from Admin `generateLink` when present. */
  generateLinkUserId: string | null;
  /** True when `generateLink` user id disagrees with `phoneOwnerId` (abort before verifyOtp). */
  hadLinkUserVsPhoneOwnerMismatch: boolean;
  /** Last magic-link attempt: JWT `sub` (canonical). */
  jwtSub: string | null;
  /** Last attempt: `session.user?.id` from verifyOtp (may disagree with `sub`). */
  sessionObjectUserId: string | null;
  /** From `auth_user_id_for_phone_digits` for this request. */
  phoneOwnerId: string | null;
  /** True when `auth_email_for_user_id` returned an email — we do not try other `...@phone.local` digit forms. */
  skippedPhoneLocalVariants: boolean;
  seedAttempted: boolean;
  lastSeedError: string | null;
};

function emptyDiag(): OtpSessionFailureDiag {
  return {
    interopVersion: VERIFY_OTP_INTEROP_VERSION,
    candidatesTried: 0,
    rpcEmailPresent: false,
    rpcEmailError: null,
    lastGenerateLinkError: null,
    lastVerifyOtpError: null,
    lastVerifyOtpStage: null,
    lastCandidateRedacted: null,
    hadSessionUserMismatch: false,
    generateLinkUserId: null,
    hadLinkUserVsPhoneOwnerMismatch: false,
    jwtSub: null,
    sessionObjectUserId: null,
    phoneOwnerId: null,
    skippedPhoneLocalVariants: false,
    seedAttempted: false,
    lastSeedError: null,
  };
}

/** JWT `sub` when GoTrue omits session.user or getUser hits "Database error querying schema". */
function parseJwtSub(accessToken: string): string | undefined {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return undefined;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { sub?: string };
    return typeof payload.sub === "string" ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}

/** Resolve user id when session.user is missing (some GoTrue responses omit it). */
async function resolveUserIdFromAccessToken(accessToken: string): Promise<string | undefined> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const withAuth = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await withAuth.auth.getUser();
  if (error) return undefined;
  return data.user?.id;
}

type ResolvedSessionUser = {
  id: string;
  jwtSub: string | null;
  sessionObjectUserId: string | null;
};

/** Prefer JWT `sub` over `session.user.id` when both exist (GoTrue can return a stale/wrong user object). */
async function resolveSessionUserId(
  session: NonNullable<
    Awaited<ReturnType<typeof supabaseAnon.auth.verifyOtp>>["data"]
  >["session"],
  requestId: string,
): Promise<ResolvedSessionUser | undefined> {
  const fromObj = session.user?.id;
  const fromJwt = session.access_token ? parseJwtSub(session.access_token) : undefined;

  if (fromJwt && fromObj && fromJwt !== fromObj) {
    edgeLog("warn", "verify-otp JWT sub differs from session.user.id; using sub", {
      requestId,
      jwtSub: fromJwt,
      sessionObjectUserId: fromObj,
    });
  }

  if (fromJwt) {
    return { id: fromJwt, jwtSub: fromJwt, sessionObjectUserId: fromObj ?? null };
  }
  if (fromObj) {
    return { id: fromObj, jwtSub: null, sessionObjectUserId: fromObj };
  }
  if (session.access_token) {
    const fromGetUser = await resolveUserIdFromAccessToken(session.access_token);
    if (fromGetUser) {
      return { id: fromGetUser, jwtSub: null, sessionObjectUserId: fromObj ?? null };
    }
  }
  return undefined;
}

/**
 * Session after Twilio OTP: generateLink email must match auth.users.email exactly.
 */
async function tryMagicLinkSession(
  emailForLink: string,
  resolvedUserId: string,
  phoneOwnerId: string | null,
  phone: string,
  requestId: string,
  diag: OtpSessionFailureDiag,
): Promise<{ access_token: string; refresh_token: string } | null> {
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: emailForLink,
  });
  if (linkError) {
    diag.lastGenerateLinkError = String(linkError.message);
    edgeLog("warn", "verify-otp generateLink", {
      requestId,
      userId: resolvedUserId,
      candidateRedacted: redactEmailForLog(emailForLink),
      error: diag.lastGenerateLinkError,
    });
    return null;
  }
  diag.lastGenerateLinkError = null;
  if (!linkData?.properties?.hashed_token) {
    edgeLog("warn", "verify-otp generateLink no hashed_token", { requestId, userId: resolvedUserId });
    return null;
  }

  type LinkGenUser = { user?: { id?: string } };
  const linkUserId = (linkData as LinkGenUser)?.user?.id ?? null;
  if (linkUserId) {
    diag.generateLinkUserId = linkUserId;
  }
  if (phoneOwnerId != null && linkUserId != null && linkUserId !== phoneOwnerId) {
    diag.hadLinkUserVsPhoneOwnerMismatch = true;
    diag.lastGenerateLinkError =
      `generateLink user ${linkUserId} !== phone owner ${phoneOwnerId} (merge duplicate auth.users or fix phone digits RPC)`;
    edgeLog("error", "verify-otp generateLink user id does not match phoneOwnerId", {
      requestId,
      resolvedUserId,
      phoneOwnerId,
      linkUserId,
      candidateRedacted: redactEmailForLog(emailForLink),
    });
    return null;
  }

  let verifyData: Awaited<ReturnType<typeof supabaseAnon.auth.verifyOtp>>["data"];
  let verifyError: Awaited<ReturnType<typeof supabaseAnon.auth.verifyOtp>>["error"];
  ({ data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "email",
  }));
  diag.lastVerifyOtpStage = "email";
  if (verifyError) {
    diag.lastVerifyOtpError = String(verifyError.message);
    edgeLog("warn", "verify-otp verifyOtp (email)", {
      requestId,
      userId: resolvedUserId,
      candidateRedacted: redactEmailForLog(emailForLink),
      error: diag.lastVerifyOtpError,
    });
    ({ data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    }));
    diag.lastVerifyOtpStage = "magiclink";
    if (verifyError) {
      diag.lastVerifyOtpError = String(verifyError.message);
      edgeLog("warn", "verify-otp verifyOtp (magiclink)", {
        requestId,
        userId: resolvedUserId,
        candidateRedacted: redactEmailForLog(emailForLink),
        error: diag.lastVerifyOtpError,
      });
      return null;
    }
  } else {
    diag.lastVerifyOtpError = null;
  }

  if (verifyError) {
    return null;
  }

  if (!verifyData?.session) {
    edgeLog("warn", "verify-otp verifyOtp no session", { requestId, userId: resolvedUserId });
    return null;
  }

  const resolved = await resolveSessionUserId(verifyData.session, requestId);
  if (!resolved) {
    edgeLog("warn", "verify-otp could not resolve session user id", {
      requestId,
      userId: resolvedUserId,
      candidateRedacted: redactEmailForLog(emailForLink),
    });
    return null;
  }
  diag.jwtSub = resolved.jwtSub;
  diag.sessionObjectUserId = resolved.sessionObjectUserId;
  const sessionUserId = resolved.id;

  if (linkUserId != null && sessionUserId !== linkUserId) {
    diag.hadSessionUserMismatch = true;
    diag.lastVerifyOtpError = `session sub ${sessionUserId} !== generateLink user ${linkUserId}`;
    edgeLog("error", "verify-otp JWT sub differs from generateLink user id", {
      requestId,
      linkUserId,
      sessionUserId,
      candidateRedacted: redactEmailForLog(emailForLink),
    });
    return null;
  }

  const matchesProfile = sessionUserId === resolvedUserId;
  const matchesPhoneOwner = phoneOwnerId != null && sessionUserId === phoneOwnerId;

  if (!matchesProfile && !matchesPhoneOwner) {
    diag.hadSessionUserMismatch = true;
    edgeLog("warn", "verify-otp session user mismatch", {
      requestId,
      resolvedUserId,
      phoneOwnerId,
      sessionUserId,
      candidateRedacted: redactEmailForLog(emailForLink),
    });
    return null;
  }

  if (!matchesProfile && matchesPhoneOwner) {
    edgeLog("warn", "verify-otp profiles.user_id stale vs auth phone owner; accepting session", {
      requestId,
      profileUserId: resolvedUserId,
      sessionUserId,
    });
  }

  edgeLog("info", `OTP login successful for ${phone}`, { requestId });
  await enqueueAuthMomLogin(sessionUserId, requestId);
  return {
    access_token: verifyData.session.access_token,
    refresh_token: verifyData.session.refresh_token,
  };
}

async function sessionAfterPhoneOtp(
  phoneDigits: string,
  resolvedUserId: string,
  phoneOwnerId: string | null,
  phone: string,
  requestId: string,
  diag: OtpSessionFailureDiag,
): Promise<{ access_token: string; refresh_token: string } | null> {
  diag.phoneOwnerId = phoneOwnerId;
  // Prefer auth.users row that owns this phone (Twilio); avoids wrong profile user_id.
  const idForEmailRpc = phoneOwnerId ?? resolvedUserId;

  const { data: emailFromDb, error: emailRpcErr } = await supabaseAdmin.rpc(
    "auth_email_for_user_id",
    { p_user_id: idForEmailRpc },
  );
  if (emailRpcErr) {
    diag.rpcEmailError = emailRpcErr.message;
    edgeLog("warn", "auth_email_for_user_id RPC failed (apply migration 20260329130000? NOTIFY pgrst reload?)", {
      requestId,
      err: emailRpcErr.message,
    });
  }

  const rpcEmail =
    emailFromDb != null && String(emailFromDb).trim().length > 0
      ? String(emailFromDb).trim()
      : null;
  if (rpcEmail) diag.rpcEmailPresent = true;

  const tryEmails = async (
    emails: string[],
    phase: "rpc_email" | "phone_local_variants",
  ): Promise<{ access_token: string; refresh_token: string } | null> => {
    const seen = new Set<string>();
    for (const email of emails) {
      if (!email || seen.has(email)) continue;
      seen.add(email);
      diag.candidatesTried += 1;
      diag.lastCandidateRedacted = redactEmailForLog(email);
      const tokens = await tryMagicLinkSession(email, resolvedUserId, phoneOwnerId, phone, requestId, diag);
      if (tokens) {
        if (phase === "phone_local_variants") {
          edgeLog("warn", "verify-otp succeeded via phone.local variants; duplicate auth.users for same handset?", {
            requestId,
            resolvedUserId,
            phoneOwnerId,
          });
        }
        return tokens;
      }
    }
    return null;
  };

  // Exact auth.users.email from RPC: only that identity. Do not fall back to other digit forms —
  // they are different emails and may belong to another auth.users row (duplicate handsets).
  if (rpcEmail) {
    diag.skippedPhoneLocalVariants = true;
    return await tryEmails([rpcEmail], "rpc_email");
  }

  diag.skippedPhoneLocalVariants = false;
  return await tryEmails(phoneLocalIdentityVariants(phoneDigits), "phone_local_variants");
}

/**
 * Verify OTP with Twilio.
 * - New user: returns { verified: true }. Account creation happens in /register.
 * - Returning user: verifies OTP, creates session, returns { verified: true, access_token, refresh_token }.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit("verify-otp", null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { phone, code } = await req.json();

    if (!phone || typeof phone !== "string" || phone.length < 8) {
      return errorResponse(400, "Invalid phone number", { requestId });
    }
    if (!code || typeof code !== "string" || code.length !== 6) {
      return errorResponse(400, "Invalid verification code", { requestId });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!accountSid || !authToken || !serviceSid) {
      return errorResponse(500, TWILIO_NOT_CONFIGURED_MESSAGE, { requestId });
    }

    // Verify OTP with Twilio Verify (must use same E.164 format as send-otp)
    const phoneE164 = toE164(phone);
    const credentials = btoa(`${accountSid}:${authToken}`);
    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phoneE164, Code: code }),
      },
    );

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok || twilioData.status !== "approved") {
      edgeLog("error", "Twilio verify failed", { requestId, twilioData: JSON.stringify(twilioData) });
      return errorResponse(400, "Invalid or expired verification code", { requestId });
    }

    edgeLog("info", `OTP verified for ${phone}`, { requestId });

    const phoneDigits = phoneE164.replace(/\D/g, "");
    const phoneVariants = [...new Set([phoneE164, phoneDigits, `+${phoneDigits}`].filter(Boolean))];
    let debugReason: string | undefined;

    const [{ data: profile }, { data: uidFromAuth, error: authIdErr }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("user_id")
        .in("phone", phoneVariants)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin.rpc("auth_user_id_for_phone_digits", { p_digits: phoneDigits }),
    ]);

    if (authIdErr) {
      edgeLog("warn", "auth_user_id_for_phone_digits RPC failed (apply migration 20260329120000?)", {
        requestId,
        err: authIdErr.message,
      });
    }
    const phoneOwnerId = parseRpcUuid(uidFromAuth);

    let resolvedUserId: string | null = profile?.user_id ?? null;
    if (!resolvedUserId) {
      resolvedUserId = phoneOwnerId;
    }

    if (resolvedUserId) {
      const diag = emptyDiag();
      let tokens = await sessionAfterPhoneOtp(phoneDigits, resolvedUserId, phoneOwnerId, phone, requestId, diag);

      if (!tokens) {
        const seedPw = Deno.env.get("SEED_USER_PASSWORD");
        if (seedPw) {
          diag.seedAttempted = true;
          const phoneFormats = [...new Set([phoneE164, `+${phoneDigits}`, phoneDigits, phone].filter((f): f is string => !!f && f.length >= 8))];
          for (const fmt of phoneFormats) {
            const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
              phone: fmt,
              password: seedPw,
            });
            if (signInErr) {
              diag.lastSeedError = String(signInErr.message);
            }
            if (!signInErr && signInData?.session) {
              edgeLog("info", `OTP login successful via signInWithPassword fallback for ${phone}`, { requestId });
              const uid = signInData.session.user?.id ?? resolvedUserId;
              await enqueueAuthMomLogin(uid, requestId);
              return successResponse({
                verified: true,
                access_token: signInData.session.access_token,
                refresh_token: signInData.session.refresh_token,
              }, requestId);
            }
          }
        }
      }

      if (tokens) {
        return successResponse({
          verified: true,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        }, requestId);
      }

      debugReason = "session_failed_phone_identity_or_seed";
      edgeLog("error", "Returning user: could not establish session", {
        requestId,
        userId: resolvedUserId,
        debugReason,
        sessionDiag: {
          interopVersion: diag.interopVersion,
          candidatesTried: diag.candidatesTried,
          rpcEmailPresent: diag.rpcEmailPresent,
          rpcEmailError: diag.rpcEmailError,
          lastGenerateLinkError: diag.lastGenerateLinkError,
          lastVerifyOtpError: diag.lastVerifyOtpError,
          lastVerifyOtpStage: diag.lastVerifyOtpStage,
          lastCandidateRedacted: diag.lastCandidateRedacted,
          hadSessionUserMismatch: diag.hadSessionUserMismatch,
          generateLinkUserId: diag.generateLinkUserId,
          hadLinkUserVsPhoneOwnerMismatch: diag.hadLinkUserVsPhoneOwnerMismatch,
          jwtSub: diag.jwtSub,
          sessionObjectUserId: diag.sessionObjectUserId,
          phoneOwnerId: diag.phoneOwnerId,
          skippedPhoneLocalVariants: diag.skippedPhoneLocalVariants,
          seedAttempted: diag.seedAttempted,
          lastSeedError: diag.lastSeedError,
        },
      });
    } else {
      debugReason = `no_user (phoneDigits=${phoneDigits})`;
      edgeLog("info", `No profile or auth user for phone, treating as new user`, { requestId, phone, phoneDigits });
    }

    const res: Record<string, unknown> = { verified: true };
    if (debugReason) {
      res._debug = debugReason;
      res._verify_otp_interop = VERIFY_OTP_INTEROP_VERSION;
    }
    return successResponse(res, requestId);
  } catch (err) {
    edgeLog("error", "verify-otp error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
