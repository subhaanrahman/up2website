import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '@/features/events';
import { eventsApi, rsvpApi } from '@/api';
import type { CreateEventInput, UpdateEventInput, EventFilter } from '@/features/events';



/** Default cap for `useEvents()` when no limit is passed (avoids unbounded list fetch). */
export const DEFAULT_USE_EVENTS_LIMIT = 100;

export const eventKeys = {
  all: ['events'] as const,
  list: (filters?: { limit?: number }) => [...eventKeys.all, 'list', filters] as const,
  search: (filters: Record<string, unknown>) => [...eventKeys.all, 'search', filters] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  hostEvents: (hostId: string) => [...eventKeys.all, 'host', hostId] as const,
  rsvps: (eventId: string) => [...eventKeys.all, 'rsvps', eventId] as const,
};

export function useEvents(options?: { limit?: number }) {
  const limit = options?.limit ?? DEFAULT_USE_EVENTS_LIMIT;
  return useQuery({
    queryKey: eventKeys.list({ limit }),
    queryFn: () => eventsService.listEvents({ limit }),
  });
}

export function useSearchEvents(options: { query?: string; filter?: EventFilter; city?: string; limit?: number }) {
  return useQuery({
    queryKey: eventKeys.search(options),
    queryFn: async () => {
      try {
        return await eventsService.searchEvents(options);
      } catch {
        return [];
      }
    },
    retry: 1,
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id!),
    queryFn: () => eventsService.getEvent(id!),
    enabled: !!id,
  });
}

export function useHostEvents(hostId: string | undefined) {
  return useQuery({
    queryKey: eventKeys.hostEvents(hostId!),
    queryFn: () => eventsService.getHostEvents(hostId!),
    enabled: !!hostId,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => eventsApi.create(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: eventKeys.all }); },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEventInput) => eventsApi.update(input),
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(input.id) });
      qc.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => eventsApi.delete(eventId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: eventKeys.all }); },
  });
}

export function useRsvpJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status?: string }) =>
      rsvpApi.join(eventId, status),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: eventKeys.rsvps(eventId) });
    },
  });
}

export function useRsvpLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => rsvpApi.leave(eventId),
    onSuccess: (_, eventId) => {
      qc.invalidateQueries({ queryKey: eventKeys.rsvps(eventId) });
    },
  });
}
