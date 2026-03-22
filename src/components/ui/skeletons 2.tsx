import { cn } from "@/lib/utils";

export function TileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-tile-sm border border-border bg-card p-3", className)}>
      <div className="flex gap-3">
        <div className="h-24 w-20 rounded-md bg-secondary animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-secondary animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-secondary animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-secondary animate-pulse" />
          <div className="h-7 w-32 rounded-full bg-secondary animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ThreadRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-tile-sm px-1 py-3", className)}>
      <div className="h-11 w-11 rounded-full bg-secondary animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/5 rounded bg-secondary animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-secondary animate-pulse" />
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-tile border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-full bg-secondary animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-secondary animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-secondary animate-pulse" />
          <div className="h-8 w-36 rounded-full bg-secondary animate-pulse" />
        </div>
      </div>
    </div>
  );
}
