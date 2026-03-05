import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smile, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  children?: React.ReactNode;
}

interface TenorGif {
  id: string;
  media_formats: {
    tinygif?: { url: string };
    gif?: { url: string };
  };
}

const GifPicker = ({ onSelect, children }: GifPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = async (query: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gif-search", {
        body: { query: query || "trending", limit: 20 },
      });
      if (error) throw error;
      setGifs(data?.results || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchGifs("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(search), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
            <Smile className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GIFs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="h-64">
          {loading ? (
            <div className="flex items-center justify-center h-full py-8">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 p-1">
              {gifs.map((gif) => {
                const url = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url;
                if (!url) return null;
                return (
                  <button
                    key={gif.id}
                    onClick={() => {
                      const fullUrl = gif.media_formats?.gif?.url || url;
                      onSelect(fullUrl);
                      setOpen(false);
                    }}
                    className="rounded overflow-hidden hover:ring-2 ring-primary transition-all"
                  >
                    <img src={url} alt="GIF" className="w-full h-24 object-cover" loading="lazy" />
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground text-center py-1">Powered by Tenor</p>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default GifPicker;
