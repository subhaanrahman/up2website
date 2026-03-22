import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { processJob, type JobType } from "../_shared/queue.ts";

// Register all job handlers before processing
import "../_shared/job-handlers.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed', { requestId });
  }

  const authorized = await verifyOidc(req, requestId);
  if (!authorized) {
    return errorResponse(401, 'Unauthorized', { requestId });
  }

  let body: { job?: { id: string; type: string; payload: unknown; createdAt: string; maxAttempts: number } };
  try {
    body = await req.json();
  } catch (err) {
    edgeLog('error', 'Invalid JSON body', { requestId, error: String(err) });
    return errorResponse(400, 'Invalid JSON body', { requestId });
  }

  if (!body?.job?.type || !body.job.id) {
    return errorResponse(400, 'Missing job payload', { requestId });
  }

  if (!isJobType(body.job.type)) {
    return errorResponse(400, 'Invalid job type', { requestId });
  }

  const job = {
    id: body.job.id,
    type: body.job.type,
    payload: body.job.payload,
    createdAt: body.job.createdAt ?? new Date().toISOString(),
    attempts: 0,
    maxAttempts: body.job.maxAttempts ?? 3,
  };

  try {
    await processJob(job, { fireAndForget: false });
    return successResponse({ ok: true }, requestId);
  } catch (err) {
    edgeLog('error', 'queue-worker job failed', { requestId, jobId: job.id, error: String(err) });
    return errorResponse(500, 'Job failed', { requestId });
  }
});

async function verifyOidc(req: Request, requestId: string) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    edgeLog('warn', 'Missing Authorization bearer token', { requestId });
    return false;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const expectedAudience = Deno.env.get('CLOUD_TASKS_WORKER_URL');
  if (!expectedAudience) {
    edgeLog('error', 'CLOUD_TASKS_WORKER_URL is not set', { requestId });
    return false;
  }

  const serviceAccountEmail = getServiceAccountEmail();
  if (!serviceAccountEmail) {
    edgeLog('error', 'Service account email not available for OIDC validation', { requestId });
    return false;
  }

  const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  if (!tokenInfoRes.ok) {
    edgeLog('warn', 'OIDC tokeninfo lookup failed', { requestId, status: tokenInfoRes.status });
    return false;
  }

  const tokenInfo = await tokenInfoRes.json();
  const aud = tokenInfo.aud as string | undefined;
  const iss = tokenInfo.iss as string | undefined;
  const email = tokenInfo.email as string | undefined;

  if (aud !== expectedAudience) {
    edgeLog('warn', 'OIDC token audience mismatch', { requestId, aud, expectedAudience });
    return false;
  }

  if (email !== serviceAccountEmail) {
    edgeLog('warn', 'OIDC token service account mismatch', { requestId, email, serviceAccountEmail });
    return false;
  }

  if (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') {
    edgeLog('warn', 'OIDC token issuer mismatch', { requestId, iss });
    return false;
  }

  return true;
}

function getServiceAccountEmail() {
  const raw = Deno.env.get('CLOUD_TASKS_SERVICE_ACCOUNT_JSON');
  if (!raw) return null;

  let json = raw.trim();
  if (!json.startsWith('{')) {
    try {
      json = new TextDecoder().decode(base64Decode(json));
    } catch {
      // fall through
    }
  }

  try {
    const parsed = JSON.parse(json);
    return parsed.client_email as string | undefined;
  } catch {
    return null;
  }
}

function base64Decode(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isJobType(value: string): value is JobType {
  return JOB_TYPES.has(value);
}

const JOB_TYPES = new Set<JobType>([
  'notification.send',
  'notification.process_batch',
  'loyalty.award_points',
  'loyalty.rank_up_voucher',
  'rsvp.auto_mark_going',
  'tickets.issue',
  'referral.track',
  'cleanup.expired_orders',
  'cleanup.expired_notifications',
  'auth.login',
  'auth.signup',
]);
