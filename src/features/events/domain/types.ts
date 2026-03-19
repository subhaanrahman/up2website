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
