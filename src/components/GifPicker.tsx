import { useEffect, useRef, useState } from "react";
import { Loader2, Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { getGifPreviewUrl, getGifShareUrl, type GifSearchItem } from "@/utils/giphyGif";

interface GifSearchResponse {
  results?: GifSearchItem[];
  next_offset?: number | null;
  configured?: boolean;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  children?: React.ReactNode;
}

const GifPicker = ({ onSelect, children }: GifPickerProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<GifSearchItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const fetchSeq = useRef(0);
  const loadMoreGen = useRef(0);

  const apiQuery = () => {
    const q = debounced.trim();
    return q.length >= 1 ? q : "trending";
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setDebounced(draft), 350);
    return () => clearTimeout(t);
  }, [draft, open]);

  useEffect(() => {
    if (!open) return;
    loadMoreGen.current += 1;
    const q = apiQuery();
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    callEdgeFunction<GifSearchResponse>("gif-search", {
      body: { query: q, limit: 24, offset: 0 },
    })
      .then((data) => {
        if (seq !== fetchSeq.current) return;
        setItems(Array.isArray(data.results) ? data.results : []);
        const no = data.next_offset;
        setNextOffset(typeof no === "number" ? no : null);
        setConfigured(data.configured !== false);
      })
      .catch((e: unknown) => {
        if (seq !== fetchSeq.current) return;
        setError(e instanceof Error ? e.message : "Could not load GIFs");
        setItems([]);
        setNextOffset(null);
      })
      .finally(() => {
        if (seq === fetchSeq.current) setLoading(false);
      });
  }, [open, debounced]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft("");
      setDebounced("");
      setError(null);
      setNextOffset(null);
      setItems([]);
    }
  };

  const handleLoadMore = () => {
    if (nextOffset == null || loadingMore || loading) return;
    const q = apiQuery();
    const gen = ++loadMoreGen.current;
    setLoadingMore(true);
    callEdgeFunction<GifSearchResponse>("gif-search", {
      body: { query: q, limit: 24, offset: nextOffset },
    })
      .then((data) => {
        if (gen !== loadMoreGen.current) return;
        const more = Array.isArray(data.results) ? data.results : [];
        setItems((prev) => [...prev, ...more]);
        const no = data.next_offset;
        setNextOffset(typeof no === "number" ? no : null);
        setConfigured(data.configured !== false);
      })
      .catch((e: unknown) => {
        if (gen !== loadMoreGen.current) return;
        setError(e instanceof Error ? e.message : "Could not load more");
      })
      .finally(() => {
        if (gen === loadMoreGen.current) setLoadingMore(false);
      });
  };

  const pick = (item: GifSearchItem) => {
    const url = getGifShareUrl(item);
    if (!url) return;
    onSelect(url);
    setOpen(false);
  };

  const showUnavailable = !loading && !configured;
  const showEmpty =
    configured && !loading && items.length === 0 && !error;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children ?? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            aria-label="Add GIF"
          >
            <Smile className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,22rem)] p-0 flex flex-col"
        align="start"
        side="top"
        sideOffset={8}
      >
        <div className="p-2 border-b border-border">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search GIPHY"
            className="h-9 text-sm"
            aria-label="Search GIFs"
          />
        </div>

        <ScrollArea className="h-[min(50vh,320px)]">
          <div className="p-2">
            {loading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive px-1 py-4 text-center">{error}</p>
            )}

            {showUnavailable && (
              <p className="text-sm text-muted-foreground px-1 py-6 text-center">
                GIF search is unavailable. Set the GIPHY API key for this environment (Edge secret
                GIPHY_API_KEY).
              </p>
            )}

            {showEmpty && (
              <p className="text-sm text-muted-foreground px-1 py-6 text-center">No GIFs found.</p>
            )}

            {!loading && configured && items.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((item, idx) => {
                  const preview = getGifPreviewUrl(item);
                  const id = item.id ?? `gif-${idx}`;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="relative aspect-square rounded-md overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => pick(item)}
                    >
                      {preview ? (
                        <img
                          src={preview}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground p-2">GIF</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {configured && nextOffset != null && !loading && items.length > 0 && (
              <div className="pt-2 pb-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" aria-hidden />
                      Loading…
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border px-2 py-1.5 text-[10px] text-muted-foreground text-center">
          <a
            href="https://giphy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Powered by GIPHY
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GifPicker;
