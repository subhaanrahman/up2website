import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GifPicker from "./GifPicker";
import { callEdgeFunction } from "@/infrastructure/api-client";

vi.mock("@/infrastructure/api-client", () => ({
  callEdgeFunction: vi.fn(),
}));

const mockSearchResponse = {
  results: [
    {
      id: "gif1",
      preview_url: "https://media.giphy.com/preview.gif",
      gif_url: "https://media.giphy.com/full.gif",
    },
  ],
  next_offset: null as number | null,
  configured: true,
};

describe("GifPicker", () => {
  beforeEach(() => {
    vi.mocked(callEdgeFunction).mockResolvedValue(mockSearchResponse);
  });

  it("calls gif-search and shows preview, attribution, and selects gif_url", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<GifPicker onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /add gif/i }));

    await waitFor(() => {
      expect(callEdgeFunction).toHaveBeenCalledWith(
        "gif-search",
        expect.objectContaining({
          body: expect.objectContaining({
            query: "trending",
            limit: 24,
            offset: 0,
          }),
        }),
      );
    });

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const thumb = dialog.querySelector('img[src="https://media.giphy.com/preview.gif"]');
      expect(thumb).not.toBeNull();
    });

    expect(screen.getByRole("link", { name: /powered by giphy/i })).toHaveAttribute("href", "https://giphy.com");
    expect(screen.getByPlaceholderText("Search GIPHY")).toBeInTheDocument();

    const thumbBtn = dialog.querySelector('img[src="https://media.giphy.com/preview.gif"]')?.closest("button");
    expect(thumbBtn).not.toBeNull();
    await user.click(thumbBtn!);
    expect(onSelect).toHaveBeenCalledWith("https://media.giphy.com/full.gif");
  });
});
