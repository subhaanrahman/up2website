type InteractionPayload = {
  action: string;
  eventId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export function trackInteraction(payload: InteractionPayload) {
  const detail = {
    ...payload,
    at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("up2:interaction", { detail }));
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[interaction]", detail);
  }
}

