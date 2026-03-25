import { describe, it, expect } from "vitest";
import { getGifPreviewUrl, getGifShareUrl, type GifSearchItem } from "./giphyGif";

describe("giphyGif", () => {
  const item: GifSearchItem = {
    id: "x",
    preview_url: "https://example.com/p.gif",
    gif_url: "https://example.com/f.gif",
  };

  it("returns preview and share URLs", () => {
    expect(getGifPreviewUrl(item)).toBe("https://example.com/p.gif");
    expect(getGifShareUrl(item)).toBe("https://example.com/f.gif");
  });
});
