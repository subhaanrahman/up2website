import { config } from '@/infrastructure/config';
import { createLogger } from '@/infrastructure/logger';
import { captureClientException } from '@/infrastructure/sentry';
import type { ImageAssetType, ImageDeliveryMode, ImagePreset } from './imageUtils';

const log = createLogger('image-telemetry');
const sentEvents = new Set<string>();
const DEFAULT_SAMPLE_RATE = 0.05;

export type ImageLoadStatus = 'loaded' | 'error';
export type ImageCacheHint = 'cached' | 'network' | 'unknown';

export interface ImageTelemetryEvent {
  asset_type: ImageAssetType;
  bucket?: string | null;
  preset: ImagePreset;
  surface?: string;
  delivery_mode: ImageDeliveryMode;
  load_status: ImageLoadStatus;
  fallback_used: boolean;
  cache_hint: ImageCacheHint;
  image_path?: string | null;
  page_path?: string | null;
}

function normalizeSampleRate(value: string | undefined): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  return DEFAULT_SAMPLE_RATE;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function shouldSample(event: ImageTelemetryEvent): boolean {
  const rate = normalizeSampleRate(import.meta.env.VITE_IMAGE_TELEMETRY_SAMPLE_RATE as string | undefined);
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  const key = [
    event.asset_type,
    event.bucket ?? '',
    event.preset,
    event.surface ?? '',
    event.delivery_mode,
    event.image_path ?? '',
  ].join('|');
  return (hashString(key) % 1000) / 1000 < rate;
}

export function detectCacheHint(url: string | undefined): ImageCacheHint {
  if (!url || typeof performance === 'undefined' || typeof performance.getEntriesByName !== 'function') {
    return 'unknown';
  }

  const entry = performance.getEntriesByName(url).find((candidate) => 'transferSize' in candidate) as PerformanceResourceTiming | undefined;
  if (!entry) return 'unknown';
  if (entry.transferSize === 0 && entry.decodedBodySize > 0) return 'cached';
  if (entry.transferSize > 0) return 'network';
  return 'unknown';
}

export function extractImagePath(url: string | undefined): string | null {
  if (!url) return null;
  const markers = ['/storage/v1/object/public/', '/storage/v1/render/image/public/'];
  for (const marker of markers) {
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const tail = url.slice(idx + marker.length);
      return tail.split('?')[0] || null;
    }
  }
  return null;
}

export function reportImageTelemetry(event: ImageTelemetryEvent): void {
  if (typeof window === 'undefined') return;
  if (!shouldSample(event)) return;

  const dedupeKey = JSON.stringify(event);
  if (sentEvents.has(dedupeKey)) return;
  sentEvents.add(dedupeKey);

  void fetch(`${config.functionsUrl}/image-telemetry`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabase.anonKey,
    },
    body: JSON.stringify({ events: [event] }),
  }).catch((error) => {
    log.warn('Failed to report image telemetry', {
      message: error instanceof Error ? error.message : String(error),
      surface: event.surface,
      assetType: event.asset_type,
    });
  });
}

export function captureImageHardFailure(event: ImageTelemetryEvent): void {
  captureClientException(
    new Error('Image delivery failed after exhausting fallbacks'),
    event as unknown as Record<string, unknown>,
  );
}
