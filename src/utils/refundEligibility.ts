/**
 * Pure rules for attendee self-service ticket refunds (must match refunds-request-self edge checks).
 */
export function ticketSelfRefundAllowed(opts: {
  now: Date;
  eventDate: Date;
  refundsEnabled: boolean;
  refundDeadlineHoursBeforeEvent: number | null | undefined;
}): { ok: boolean; reason?: string } {
  if (!opts.refundsEnabled) {
    return { ok: false, reason: "Refunds are not enabled for this event." };
  }
  if (opts.now.getTime() >= opts.eventDate.getTime()) {
    return { ok: false, reason: "This event has already started or ended." };
  }
  const h = opts.refundDeadlineHoursBeforeEvent;
  if (h != null && h > 0) {
    const cutoffMs = opts.eventDate.getTime() - h * 60 * 60 * 1000;
    if (opts.now.getTime() >= cutoffMs) {
      return {
        ok: false,
        reason: `The refund window closed ${h} hour${h === 1 ? "" : "s"} before the event.`,
      };
    }
  }
  return { ok: true };
}
