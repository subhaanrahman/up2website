const SESSION_KEY = 'up2_tracking_session_id';
const REFERRAL_KEY = 'up2_referral_clicks';
const REFERRAL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface ReferralEntry {
  click_id: string;
  event_id: string;
  created_at: string;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getTrackingSessionId(): string {
  const storage = getStorage();
  if (!storage) return crypto.randomUUID();
  const existing = storage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  storage.setItem(SESSION_KEY, id);
  return id;
}

function readReferralMap(): Record<string, ReferralEntry> {
  const storage = getStorage();
  if (!storage) return {};
  const raw = storage.getItem(REFERRAL_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, ReferralEntry>;
  } catch {
    return {};
  }
}

function writeReferralMap(map: Record<string, ReferralEntry>) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(REFERRAL_KEY, JSON.stringify(map));
}

export function storeReferralClick(eventId: string, clickId: string, createdAt = new Date().toISOString()): void {
  const map = readReferralMap();
  map[eventId] = { event_id: eventId, click_id: clickId, created_at: createdAt };
  writeReferralMap(map);
}

export function getValidReferralClickId(eventId: string, maxAgeMs = REFERRAL_MAX_AGE_MS): string | null {
  const map = readReferralMap();
  const entry = map[eventId];
  if (!entry) return null;
  const age = Date.now() - new Date(entry.created_at).getTime();
  if (Number.isNaN(age) || age > maxAgeMs) {
    delete map[eventId];
    writeReferralMap(map);
    return null;
  }
  return entry.click_id;
}

export function clearReferralClick(eventId: string): void {
  const map = readReferralMap();
  if (map[eventId]) {
    delete map[eventId];
    writeReferralMap(map);
  }
}
