// Events service — business logic, delegates writes to API layer

import { eventsRepository } from '../repositories/eventsRepository';
import type { EventEntity, Rsvp } from '../domain/types';
import type { EventFilter } from '../repositories/eventsRepository';
import { createLogger } from '@/infrastructure/logger';

const logger = createLogger('events.service');

export const eventsService = {
  async listEvents(options?: { limit?: number; category?: string }): Promise<EventEntity[]> {
    return eventsRepository.list(options);
  },

  async searchEvents(options: { query?: string; category?: string; limit?: number }): Promise<EventEntity[]> {
    return eventsRepository.search(options);
  },

  async getEvent(id: string): Promise<EventEntity | null> {
    return eventsRepository.getById(id);
  },

  async getHostEvents(hostId: string): Promise<EventEntity[]> {
    return eventsRepository.getByHost(hostId);
  },

  async getEventRsvps(eventId: string): Promise<Rsvp[]> {
    return eventsRepository.getRsvps(eventId);
  },

  async getUserRsvp(eventId: string, userId: string): Promise<Rsvp | null> {
    return eventsRepository.getUserRsvp(eventId, userId);
  },
};
