import { describe, it, expect } from "vitest";
import { ticketSelfRefundAllowed } from "./refundEligibility";

describe("ticketSelfRefundAllowed", () => {
  const eventDate = new Date("2030-06-15T20:00:00.000Z");

  it("rejects when refunds disabled", () => {
    const r = ticketSelfRefundAllowed({
      now: new Date("2030-06-01T12:00:00.000Z"),
      eventDate,
      refundsEnabled: false,
      refundDeadlineHoursBeforeEvent: null,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects after event start", () => {
    const r = ticketSelfRefundAllowed({
      now: new Date("2030-06-15T21:00:00.000Z"),
      eventDate,
      refundsEnabled: true,
      refundDeadlineHoursBeforeEvent: null,
    });
    expect(r.ok).toBe(false);
  });

  it("allows before event when enabled and no deadline hours", () => {
    const r = ticketSelfRefundAllowed({
      now: new Date("2030-06-14T12:00:00.000Z"),
      eventDate,
      refundsEnabled: true,
      refundDeadlineHoursBeforeEvent: null,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects inside hours-before window", () => {
    const r = ticketSelfRefundAllowed({
      now: new Date("2030-06-15T18:00:00.000Z"),
      eventDate,
      refundsEnabled: true,
      refundDeadlineHoursBeforeEvent: 3,
    });
    expect(r.ok).toBe(false);
  });

  it("allows before hours-before cutoff", () => {
    const r = ticketSelfRefundAllowed({
      now: new Date("2030-06-15T16:00:00.000Z"),
      eventDate,
      refundsEnabled: true,
      refundDeadlineHoursBeforeEvent: 3,
    });
    expect(r.ok).toBe(true);
  });
});
