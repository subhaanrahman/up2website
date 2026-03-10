/**
 * Queue abstraction — in-memory implementation for now.
 * Future: swap for GCP Cloud Tasks with a single adapter change.
 *
 * This module is used by FRONTEND code only.
 * Edge functions use supabase/functions/_shared/queue.ts instead.
 */

// ── Job type registry (mirrors edge function types) ────────────────
export type JobType =
  | 'notification.send'
  | 'loyalty.award_points'
  | 'referral.track'
  | 'cleanup.expired_orders'
  | 'cleanup.expired_notifications';

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  payload: T;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
}

type Handler<T = unknown> = (payload: T) => Promise<void>;

// ── Queue adapter interface ────────────────────────────────────────
// When migrating to Cloud Tasks, implement this interface instead.
export interface QueueAdapter {
  enqueue<T>(type: JobType, payload: T, options?: { maxAttempts?: number }): Promise<Job<T>>;
  getJobs(): Job[];
}

// ── In-memory adapter (current) ────────────────────────────────────
class InMemoryQueue implements QueueAdapter {
  private handlers = new Map<string, Handler>();
  private jobs: Job[] = [];
  private counter = 0;

  register<T>(type: JobType, handler: Handler<T>) {
    this.handlers.set(type, handler as Handler);
  }

  async enqueue<T>(type: JobType, payload: T, options: { maxAttempts?: number } = {}): Promise<Job<T>> {
    const { maxAttempts = 3 } = options;
    const job: Job<T> = {
      id: `job_${++this.counter}`,
      type,
      payload,
      createdAt: new Date(),
      status: 'pending',
      attempts: 0,
      maxAttempts,
    };
    this.jobs.push(job as Job);

    const handler = this.handlers.get(type);
    if (handler) {
      job.status = 'processing';
      job.attempts++;
      try {
        await handler(payload);
        job.status = 'completed';
      } catch (err) {
        console.error(`[queue] Job ${job.id} (${type}) failed:`, err);
        job.status = 'failed';
      }
    }
    return job;
  }

  getJobs() {
    return [...this.jobs];
  }
}

export const queue: QueueAdapter = new InMemoryQueue();

// Re-export register for the in-memory adapter
export function registerHandler<T>(type: JobType, handler: Handler<T>) {
  (queue as InMemoryQueue).register(type, handler);
}
