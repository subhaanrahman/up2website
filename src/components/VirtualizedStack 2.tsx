import { useMemo, useState } from "react";

interface VirtualizedStackProps<T> {
  items: T[];
  itemHeight: number;
  viewportHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export default function VirtualizedStack<T>({
  items,
  itemHeight,
  viewportHeight,
  overscan = 5,
  renderItem,
  className,
}: VirtualizedStackProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const { start, end, topPadding, bottomPadding } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    return {
      start: startIndex,
      end: endIndex,
      topPadding: startIndex * itemHeight,
      bottomPadding: Math.max(0, (items.length - endIndex) * itemHeight),
    };
  }, [items.length, itemHeight, overscan, scrollTop, viewportHeight]);

  const visibleItems = items.slice(start, end);

  return (
    <div
      className={className}
      style={{ maxHeight: viewportHeight, overflowY: "auto" }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ paddingTop: topPadding, paddingBottom: bottomPadding }}>
        {visibleItems.map((item, i) => renderItem(item, start + i))}
      </div>
    </div>
  );
}
