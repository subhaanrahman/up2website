/**
 * Queue Abstraction for Edge Functions
 *
 * Current: in-process execution (direct function call).
 * Future:  swap to GCP Cloud Tasks by changing `dispatch()`.
 *
 * All async side-effects should be routed through `enqueue()` so
 * the swap is a single-file change.
 */

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ── Job type registry ──────────────────────────────────────────────
export type JobType =
  | 'notification.send'
  | 'notification.process_batch'
  | 'loyalty.award_points'
  | 'loyalty.rank_up_voucher'
  | 'rsvp.auto_mark_going'
  | 'tickets.issue'
  | 'referral.track'
  | 'cleanup.expired_orders'
  | 'cleanup.expired_notifications';

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  payload: T;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
}

// ── Payload types per job ──────────────────────────────────────────

export interface NotificationSendPayload {
  user_id: string;
  type: string;
  title: string;
  message: string;
  avatar_url?: string | null;
  event_image?: string | null;
  link?: string | null;
  organiser_profile_id?: string | null;
}

export interface LoyaltyAwardPayload {
  user_id: string;
  action_type: string;
  description?: string;
}

export interface RankUpVoucherPayload {
  user_id: string;
  new_rank: string;
}

export interface AutoRsvpPayload {
  user_id: string;
  event_id: string;
  status: string;
}

export interface TicketsIssuePayload {
  order_id: string;
  event_id: string;
  ticket_tier_id: string | null;
  user_id: string;
  quantity: number;
}

export interface ReferralTrackPayload {
  referrer_id: string;
  referred_id: string;
  event_id?: string;
}

// ── Handler registry ───────────────────────────────────────────────

type Handler = (payload: unknown, serviceClient: SupabaseClient) => Promise<void>;
const handlers = new Map<JobType, Handler>();

export function registerHandler<T>(type: JobType, handler: (payload: T, serviceClient: SupabaseClient) => Promise<void>) {
  handlers.set(type, handler as Handler);
}

// ── Queue implementation ───────────────────────────────────────────

let jobCounter = 0;

/**
 * Enqueue a job for async processing.
 *
 * Current impl: executes in-process immediately.
 * Future impl:  POST to Cloud Tasks HTTP target.
 *
 * @param fireAndForget  If true (default), errors are logged but don't propagate.
 *                       Set false for critical jobs where you need the result.
 */
export async function enqueue<T>(
  type: JobType,
  payload: T,
  options: { fireAndForget?: boolean; maxAttempts?: number } = {},
): Promise<void> {
  const { fireAndForget = true, maxAttempts = 3 } = options;

  const job: Job<T> = {
    id: `job_${++jobCounter}_${Date.now()}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts,
  };

  // ── In-process execution (stub adapter) ──────────────────────
  const handler = handlers.get(type);
  if (!handler) {
    console.warn(`[queue] No handler registered for job type "${type}", skipping job ${job.id}`);
    return;
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  while (job.attempts < job.maxAttempts) {
    job.attempts++;
    try {
      await handler(payload, serviceClient);
      return; // success
    } catch (err) {
      console.error(`[queue] Job ${job.id} (${type}) attempt ${job.attempts}/${job.maxAttempts} failed:`, err);
      if (job.attempts >= job.maxAttempts) {
        if (!fireAndForget) throw err;
        console.error(`[queue] Job ${job.id} exhausted retries, discarding.`);
      }
    }
  }
}

/**
 * Enqueue multiple jobs of the same type (batch helper).
 */
export async function enqueueBatch<T>(
  type: JobType,
  payloads: T[],
  options: { fireAndForget?: boolean; maxAttempts?: number } = {},
): Promise<void> {
  await Promise.allSettled(
    payloads.map(p => enqueue(type, p, options)),
  );
}
