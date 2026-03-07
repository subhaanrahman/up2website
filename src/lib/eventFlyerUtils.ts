import flyer1 from "@/assets/flyer-1.jpg";
import flyer2 from "@/assets/flyer-2.jpg";
import flyer3 from "@/assets/flyer-3.jpg";
import flyer4 from "@/assets/flyer-4.jpg";
import flyer5 from "@/assets/flyer-5.jpg";

const flyers = [flyer1, flyer2, flyer3, flyer4, flyer5];

/**
 * Get a flyer image based on event ID
 * Cycles through available flyers deterministically
 */
export const getEventFlyer = (eventId: string): string => {
  const hash = eventId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return flyers[hash % flyers.length];
};
