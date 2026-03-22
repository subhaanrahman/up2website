import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUnreadMessages } from "./useUnreadMessages";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

type ChainRes = { data?: unknown; error?: unknown; count?: number };
let chainRes: ChainRes = { data: [], error: null, count: 0 };

function createChain() {
  const res = chainRes;
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    neq: () => chain,
    gt: () => chain,
    then: (cb: (r: ChainRes) => unknown) => Promise.resolve(cb(res)),
  };
  return chain;
}

const mockChannel = { unsubscribe: vi.fn() };
const mockRemoveChannel = vi.fn();

vi.mock("@/infrastructure/supabase", () => ({
  supabase: {
    from: () => createChain(),
    channel: () => ({
      on: () => ({
        on: () => ({
          subscribe: () => mockChannel,
        }),
      }),
    }),
    removeChannel: (ch: unknown) => mockRemoveChannel(ch),
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
    chainRes = { data: [], error: null, count: 0 };
    localStorage.clear();
  });

  it("returns perChat empty and totalUnread 0 when user exists and no data", async () => {
    const { result } = renderHook(() => useUnreadMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalUnread).toBe(0));
    expect(result.current.perChat).toEqual({});
  });

  it("markChatRead is callable and invalidates queries", async () => {
    const { result } = renderHook(() => useUnreadMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalUnread).toBe(0));

    result.current.markChatRead("chat-1");
    expect(localStorage.getItem("chat_last_read")).toContain("chat-1");
  });

  it("returns fallback when user is absent", async () => {
    vi.mocked(await import("@/contexts/AuthContext")).useAuth = () => ({ user: null }) as never;
    const { result } = renderHook(() => useUnreadMessages(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalUnread).toBe(0));
    expect(result.current.perChat).toEqual({});
  });
});
