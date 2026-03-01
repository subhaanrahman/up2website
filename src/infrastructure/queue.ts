// Queue abstraction — in-memory implementation for now.
// Future: swap for a real queue (BullMQ, SQS, etc.)

export interface Job<T = unknown> {
  id: string;
  type: string;
  payload: T;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

type Handler<T = unknown> = (payload: T) => Promise<void>;

class InMemoryQueue {
  private handlers = new Map<string, Handler>();
  private jobs: Job[] = [];
  private counter = 0;

  register<T>(type: string, handler: Handler<T>) {
    this.handlers.set(type, handler as Handler);
  }

  async enqueue<T>(type: string, payload: T): Promise<Job<T>> {
    const job: Job<T> = {
      id: `job_${++this.counter}`,
      type,
      payload,
      createdAt: new Date(),
      status: 'pending',
    };
    this.jobs.push(job as Job);

    // Process immediately (in-memory = synchronous queue)
    const handler = this.handlers.get(type);
    if (handler) {
      job.status = 'processing';
      try {
        await handler(payload);
        job.status = 'completed';
      } catch {
        job.status = 'failed';
      }
    }
    return job;
  }

  getJobs() {
    return [...this.jobs];
  }
}

export const queue = new InMemoryQueue();
