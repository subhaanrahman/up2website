/**
 * Enqueue low-risk MOM jobs on sign-in / sign-up so GCP Cloud Tasks shows activity
 * when CLOUD_TASKS_ENABLED=true (same path as payment follow-ups).
 */
import { enqueue } from "./queue.ts";
import { edgeLog } from "./logger.ts";
import type { AuthMomPayload } from "./queue.ts";
import { isCloudTasksEnabled } from "./cloud-tasks.ts";

export async function enqueueAuthMomLogin(userId: string, requestId: string): Promise<void> {
  await enqueueSafe("auth.login", { user_id: userId, edge_request_id: requestId });
}

export async function enqueueAuthMomSignup(userId: string, requestId: string): Promise<void> {
  await enqueueSafe("auth.signup", { user_id: userId, edge_request_id: requestId });
}

async function enqueueSafe(type: "auth.login" | "auth.signup", payload: AuthMomPayload): Promise<void> {
  if (!isCloudTasksEnabled()) {
    edgeLog("info", "MOM auth job runs in-process (set CLOUD_TASKS_ENABLED=true + GCP secrets to enqueue to Cloud Tasks)", {
      type,
      edge_request_id: payload.edge_request_id,
    });
  }
  try {
    await enqueue(type, payload, { fireAndForget: true });
  } catch (e) {
    edgeLog("warn", "MOM auth job enqueue failed (non-fatal)", {
      type,
      error: String(e),
      edge_request_id: payload.edge_request_id,
    });
  }
}
