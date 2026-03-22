import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format price for display: "Free" for 0, otherwise whole number (no currency symbol, no cents) */
export function formatPriceForDisplay(priceCents: number): string {
  return priceCents === 0 ? "Free" : String(Math.round(priceCents / 100));
}

/** Price pill label: paid events show price, free/no-price events show "RSVP" */
export function getEventPricePillLabel(priceCents: number | null | undefined): string {
  if (priceCents != null && priceCents > 0) {
    return String(Math.round(priceCents / 100));
  }
  return "RSVP";
}

/** Whether the event has paid tickets (true = show price, false = show RSVP) */
export function eventHasPaidTickets(priceCents: number | null | undefined): boolean {
  return priceCents != null && priceCents > 0;
}
