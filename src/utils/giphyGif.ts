/** Normalized GIF row from Edge function `gif-search` (GIPHY-backed). */
export type GifSearchItem = {
  id: string;
  preview_url: string;
  gif_url: string;
};

export function getGifPreviewUrl(item: GifSearchItem): string | undefined {
  return item.preview_url;
}

export function getGifShareUrl(item: GifSearchItem): string | undefined {
  return item.gif_url;
}
