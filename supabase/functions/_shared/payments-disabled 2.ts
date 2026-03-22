import { errorResponse } from "./response.ts";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

/** When set on the Edge Function (e.g. `1`, `true`, `yes`), ticket/VIP purchase entrypoints return 503. */
export function isPaymentsDisabled(): boolean {
  const v = Deno.env.get("PAYMENTS_DISABLED")?.trim().toLowerCase();
  return v !== undefined && v !== "" && TRUE_VALUES.has(v);
}

export function paymentsDisabledResponse(requestId: string): Response {
  return errorResponse(503, "Payments are temporarily unavailable. Please try again later.", {
    requestId,
    code: "payments_disabled",
  });
}
