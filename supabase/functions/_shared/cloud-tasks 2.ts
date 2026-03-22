import { edgeLog } from "./logger.ts";

export type CloudTaskJob = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  maxAttempts: number;
};

const CLOUD_TASK_TYPES = new Set([
  'tickets.issue',
  'rsvp.auto_mark_going',
  'loyalty.award_points',
  /** Observability: enqueued from verify-otp / login / register when CLOUD_TASKS_ENABLED */
  'auth.login',
  'auth.signup',
]);

export function isCloudTasksEnabled() {
  const flag = (Deno.env.get('CLOUD_TASKS_ENABLED') || '').toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

export function shouldUseCloudTasks(type: string) {
  return CLOUD_TASK_TYPES.has(type);
}

export async function enqueueCloudTask(job: CloudTaskJob): Promise<void> {
  const config = loadConfig();

  const accessToken = await getAccessToken(config);

  const url = `https://cloudtasks.googleapis.com/v2/projects/${config.projectId}/locations/${config.location}/queues/${config.queue}/tasks`;

  const payload = {
    job,
  };

  const bodyBytes = new TextEncoder().encode(JSON.stringify(payload));
  const bodyBase64 = base64Encode(bodyBytes);

  const isAuthMomJob = job.type === 'auth.login' || job.type === 'auth.signup';
  const delaySeconds = isAuthMomJob ? config.authDelaySeconds : 0;
  const scheduleTime = delaySeconds > 0
    ? new Date(Date.now() + delaySeconds * 1000).toISOString()
    : null;

  const taskBody = {
    task: {
      httpRequest: {
        httpMethod: 'POST',
        url: config.workerUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyBase64,
        oidcToken: {
          serviceAccountEmail: config.serviceAccountEmail,
          audience: config.oidcAudience,
        },
      },
      ...(scheduleTime ? { scheduleTime } : {}),
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskBody),
  });

  if (!res.ok) {
    const text = await res.text();
    edgeLog('error', 'Cloud Tasks enqueue failed', {
      jobId: job.id,
      status: res.status,
      body: text,
    });
    throw new Error(`Cloud Tasks enqueue failed: ${res.status}`);
  }

  if (isAuthMomJob) {
    let taskName: string | null = null;
    try {
      const body = await res.json();
      taskName = typeof body?.name === 'string' ? body.name : null;
    } catch {
      // ignore JSON parse errors for logging only
    }
    edgeLog('info', 'Cloud Tasks enqueued', {
      jobType: job.type,
      jobId: job.id,
      taskName,
      queue: config.queue,
      location: config.location,
      scheduleTime,
    });
  }
}

function loadConfig() {
  const projectId = mustEnv('CLOUD_TASKS_PROJECT_ID');
  const location = mustEnv('CLOUD_TASKS_LOCATION');
  const queue = mustEnv('CLOUD_TASKS_QUEUE');
  const workerUrl = mustEnv('CLOUD_TASKS_WORKER_URL');
  const rawServiceAccount = mustEnv('CLOUD_TASKS_SERVICE_ACCOUNT_JSON');
  const authDelaySeconds = Number(Deno.env.get('CLOUD_TASKS_AUTH_DELAY_SECONDS') || '0');

  const serviceAccount = parseServiceAccount(rawServiceAccount);

  return {
    projectId,
    location,
    queue,
    workerUrl,
    oidcAudience: workerUrl,
    serviceAccountEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
    authDelaySeconds: Number.isFinite(authDelaySeconds) && authDelaySeconds > 0
      ? Math.floor(authDelaySeconds)
      : 0,
  };
}

function mustEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseServiceAccount(raw: string): { client_email: string; private_key: string } {
  let json = raw.trim();
  if (!json.startsWith('{')) {
    try {
      json = new TextDecoder().decode(base64Decode(json));
    } catch {
      // fall through and try JSON.parse
    }
  }

  const parsed = JSON.parse(json);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Service account JSON missing client_email or private_key');
  }
  return parsed;
}

async function getAccessToken(config: { serviceAccountEmail: string; privateKey: string }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/cloud-tasks',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const jwt = await signJwt(payload, config.privateKey);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`OAuth token request failed: ${tokenRes.status} ${text}`);
  }

  const data = await tokenRes.json();
  if (!data.access_token) {
    throw new Error('OAuth token response missing access_token');
  }

  return data.access_token as string;
}

async function signJwt(payload: Record<string, unknown>, privateKeyPem: string) {
  const header = { alg: 'RS256', typ: 'JWT' };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken),
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${encodedSignature}`;
}

async function importPrivateKey(pem: string) {
  const cleaned = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');

  const keyBytes = base64Decode(cleaned);

  return await crypto.subtle.importKey(
    'pkcs8',
    keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function base64UrlEncode(bytes: Uint8Array) {
  return base64Encode(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64Encode(bytes: Uint8Array) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64Decode(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
