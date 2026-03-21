export interface WaitlistEntry {
  id: string;
  created_at: string;
}

export function computeWaitlistPositions(entries: WaitlistEntry[]) {
  return entries
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((entry, idx) => ({ id: entry.id, position: idx + 1 }));
}

export function selectWaitlistPromotions(entries: WaitlistEntry[], spots: number) {
  if (spots <= 0) return [] as WaitlistEntry[];
  const ordered = entries
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return ordered.slice(0, spots);
}
