import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SendRsvp from "./SendRsvp";
import { callEdgeFunction } from "@/infrastructure/api-client";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/BottomNav", () => ({ default: () => null }));

vi.mock("@/infrastructure/api-client", () => ({
  callEdgeFunction: vi.fn(),
}));

function renderSendRsvp() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/events/evt-1/send-rsvp"]}>
        <Routes>
          <Route path="/events/:id/send-rsvp" element={<SendRsvp />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SendRsvp", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(callEdgeFunction).mockImplementation(async (name: string) => {
      if (name === "profile-search-host") {
        return {
          profiles: [
            {
              user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              username: "alice",
              display_name: null,
              avatar_url: null,
            },
          ],
        };
      }
      if (name === "rsvp-bulk-invite") {
        return { results: [{ user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", code: "ok" }] };
      }
      return {};
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("disables send when nobody is selected", () => {
    renderSendRsvp();
    expect(screen.getByRole("button", { name: /^send rsvp$/i })).toBeDisabled();
  });

  it("searches, adds a user, and sends invites", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSendRsvp();

    await user.type(screen.getByPlaceholderText(/search username/i), "al");
    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText("@alice")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /@alice/i }));

    expect(screen.getByText("Selected (1/25)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /send rsvp \(1\)/i }));

    await waitFor(() => {
      expect(callEdgeFunction).toHaveBeenCalledWith(
        "rsvp-bulk-invite",
        expect.objectContaining({
          body: expect.objectContaining({
            event_id: "evt-1",
            user_ids: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
          }),
        }),
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith("/events/evt-1/manage");
  });
});
