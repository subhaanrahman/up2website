import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUnreadMessages } from "./useUnreadMessages";

let mockUser: { id: string } | null = { id: "user-1" };
const mockRpc = vi.fn();
const mockChannel = { unsubscribe: vi.fn() };
const mockRemoveChannel = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@/infrastructure/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: () => ({
      on: () => ({
        on: () => ({
          subscribe: () => mockChannel,
        }),
      }),
    }),
    removeChannel: (channel: unknown) => mockRemoveChannel(channel),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useUnreadMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-1" };
    localStorage.clear();
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === "get_unread_message_total") {
        return Promise.resolve({ data: 0, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
  });

  it("returns perChat empty and totalUnread 0 when there is no last-read state", async () => {
    const { result } = renderHook(() => useUnreadMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalUnread).toBe(0));
    expect(result.current.perChat).toEqual({});
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("hydrates unread counts from the aggregate RPC", async () => {
    localStorage.setItem("chat_last_read", JSON.stringify({
      "chat-1": "2026-03-25T10:00:00.000Z",
    }));

    mockRpc.mockResolvedValueOnce({
      data: [{ chat_id: "chat-1", unread_count: 2 }],
      error: null,
    });

    const { result } = renderHook(() => useUnreadMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalUnread).toBe(2));
    expect(result.current.perChat).toEqual({ "chat-1": 2 });
    expect(mockRpc).toHaveBeenCalledWith("get_unread_message_counts", {
      p_last_read: { "chat-1": "2026-03-25T10:00:00.000Z" },
    });
  });

  it("markChatRead stores the timestamp locally", async () => {
    const { result } = renderHook(() => useUnreadMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalUnread).toBe(0));

    result.current.markChatRead("chat-1");
    expect(localStorage.getItem("chat_last_read")).toContain("chat-1");
  });

  it("returns fallback when user is absent", async () => {
    mockUser = null;
    const { result } = renderHook(() => useUnreadMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalUnread).toBe(0));
    expect(result.current.perChat).toEqual({});
  });
});
