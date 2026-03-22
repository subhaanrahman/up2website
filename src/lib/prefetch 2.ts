import type { QueryClient } from "@tanstack/react-query";
import { eventsRepository } from "@/features/events/repositories/eventsRepository";
import { messagingRepository } from "@/features/messaging/repositories/messagingRepository";

export function prefetchEventDetail(queryClient: QueryClient, eventId: string) {
  return queryClient.prefetchQuery({
    queryKey: ["events", "detail", eventId],
    queryFn: () => eventsRepository.getById(eventId),
    staleTime: 30_000,
  });
}

export function prefetchDmThread(queryClient: QueryClient, threadId: string) {
  return Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["dm-thread", threadId],
      queryFn: () => messagingRepository.getDmThread(threadId),
      staleTime: 20_000,
    }),
    queryClient.prefetchQuery({
      queryKey: ["dm-messages", threadId],
      queryFn: () => messagingRepository.getDmMessages(threadId),
      staleTime: 10_000,
    }),
  ]);
}

export function prefetchGroupThread(queryClient: QueryClient, threadId: string) {
  return Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["group-chat", threadId],
      queryFn: () => messagingRepository.getGroupChat(threadId),
      staleTime: 20_000,
    }),
    queryClient.prefetchQuery({
      queryKey: ["group-chat-messages", threadId],
      queryFn: () => messagingRepository.getGroupMessages(threadId),
      staleTime: 10_000,
    }),
  ]);
}
