// Events domain types

export interface EventEntity {
  id: string;
  hostId: string;
  title: string;
  description: string | null;
  location: string | null;
  venueName: string | null;
  address: string | null;
  eventDate: string;
  endDate: string | null;
  coverImage: string | null;
  category: string | null;
  maxGuests: number | null;
  isPublic: boolean;
  ticketsAvailableFrom: string | null;
  ticketsAvailableUntil: string | null;
  createdAt: string;
  updatedAt: string;
  /** Lowest ticket price in cents (from events.ticket_price_cents or ticket_tiers) */
  ticketPriceCents?: number;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  venueName?: string;
  address?: string;
  eventDate: string;
  endDate?: string;
  maxGuests?: number;
  isPublic?: boolean;
  coverImage?: string;
  organiserProfileId?: string;
  publishAt?: string;
  ticketsAvailableFrom?: string | null;
  ticketsAvailableUntil?: string | null;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
}

export interface Rsvp {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  createdAt: string;
}

export interface EventInvite {
  id: string;
  eventId: string;
  recipientUserId: string;
  inviteStatus: "pending" | "accepted" | "declined";
  sentAt: string;
}

export interface DiscoveryRailsResponse {
  nearby: EventEntity[];
  trending: EventEntity[];
  friendsGoing: EventEntity[];
  soon: EventEntity[];
}
