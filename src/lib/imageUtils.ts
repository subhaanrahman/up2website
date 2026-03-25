/**
 * Supabase Storage CDN image utilities.
 *
 * Converts `/object/public/…` URLs to `/render/image/public/…` transform
 * endpoints so the CDN serves correctly-sized, compressed images.
 *
 * External URLs (Tenor GIFs, Giphy, etc.) are returned untouched.
 */

import { config } from '@/infrastructure/config';

const OBJECT_PUBLIC_MARKER = '/storage/v1/object/public/';
const RENDER_PUBLIC_MARKER = '/storage/v1/render/image/public/';

export type ImageDeliveryMode = 'transformed' | 'raw-fallback' | 'external' | 'blob-preview';
export type ImageAssetType = 'avatar' | 'post' | 'event-flyer' | 'event-media' | 'notification' | 'external' | 'unknown';

export interface ImageCandidate {
  url: string;
  bucket: string | null;
  sourceUrl: string;
  deliveryMode: ImageDeliveryMode;
}

/**
 * Rewrites `…/storage/v1/…` URLs to the app's current Supabase project host.
 * Fixes broken avatars after migrating data from another project when rows still
 * point at an old `*.supabase.co` origin.
 */
export function normalizeSupabaseStorageUrlToProject(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  const marker = '/storage/v1/';
  const idx = trimmed.indexOf(marker);
  if (idx === -1) return trimmed;
  const pathFromStorage = trimmed.slice(idx);
  const base = (config.supabase.url || '').replace(/\/$/, '');
  if (!base) return trimmed;
  return `${base}${pathFromStorage}`;
}

// ── Standard image size presets ─────────────────────────────────────────────
export const IMAGE_SIZES = {
  /** Tiny avatars in lists / collaborator chips (28–40px rendered) */
  AVATAR_SM: { width: 64, quality: 80 },
  /** Profile header / feed avatars (40–56px rendered) */
  AVATAR_MD: { width: 128, quality: 80 },
  /** Large profile editor avatars */
  AVATAR_LG: { width: 256, quality: 82 },
  /** Event card thumbnails */
  EVENT_CARD: { width: 400, quality: 75 },
  /** Feed post images / inline media */
  FEED_IMAGE: { width: 600, quality: 80 },
  /** Event detail hero & full-bleed images */
  EVENT_HERO: { width: 1200, quality: 85 },
  /** Portrait flyer surfaces */
  FLYER_PORTRAIT: { width: 960, quality: 84 },
  /** Square event gallery thumbnails */
  GALLERY_GRID: { width: 480, quality: 78 },
  /** Compact event thumbnails in notifications */
  NOTIFICATION_THUMB: { width: 160, quality: 72 },
  /** Small event image embeds */
  EMBED_COVER: { width: 800, quality: 82 },
} as const;

export type ImagePreset = keyof typeof IMAGE_SIZES;

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
}

function stripQuery(url: string): string {
  return url.split('?')[0];
}

function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(OBJECT_PUBLIC_MARKER) || url.includes(RENDER_PUBLIC_MARKER);
}

function isBlobLikeUrl(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith('data:');
}

function toRawSupabaseObjectUrl(url: string): string {
  if (url.includes(OBJECT_PUBLIC_MARKER)) return url;
  if (!url.includes(RENDER_PUBLIC_MARKER)) return url;
  const [baseWithoutQuery] = url.split('?');
  return baseWithoutQuery.replace(RENDER_PUBLIC_MARKER, OBJECT_PUBLIC_MARKER);
}

export function getSupabaseStorageBucket(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const rawUrl = toRawSupabaseObjectUrl(url.trim());
  const markerIndex = rawUrl.indexOf(OBJECT_PUBLIC_MARKER);
  if (markerIndex === -1) return null;
  const path = rawUrl.slice(markerIndex + OBJECT_PUBLIC_MARKER.length);
  return path.split('/')[0] || null;
}

export function inferAssetTypeFromBucket(bucket: string | null): ImageAssetType {
  switch (bucket) {
    case 'avatars':
      return 'avatar';
    case 'post-images':
      return 'post';
    case 'event-flyers':
      return 'event-flyer';
    case 'event-media':
      return 'event-media';
    default:
      return 'unknown';
  }
}

/**
 * Builds image candidates in preferred order:
 * 1. Current project transformed URL
 * 2. Original transformed URL
 * 3. Current project raw URL
 * 4. Original raw URL
 *
 * External and local preview URLs are passed through unchanged.
 */
export function getImageCandidates(
  url: string | null | undefined,
  opts: TransformOptions | ImagePreset,
): ImageCandidate[] {
  if (!url?.trim()) return [];

  const trimmed = url.trim();
  const bucket = getSupabaseStorageBucket(trimmed);

  if (!isSupabaseStorageUrl(trimmed)) {
    return [{
      url: trimmed,
      bucket,
      sourceUrl: trimmed,
      deliveryMode: isBlobLikeUrl(trimmed) ? 'blob-preview' : 'external',
    }];
  }

  const originalRaw = toRawSupabaseObjectUrl(trimmed);
  const normalizedRaw = normalizeSupabaseStorageUrlToProject(originalRaw) ?? originalRaw;

  const candidates: ImageCandidate[] = [
    getOptimizedUrl(normalizedRaw, opts)
      ? {
          url: getOptimizedUrl(normalizedRaw, opts)!,
          bucket,
          sourceUrl: normalizedRaw,
          deliveryMode: 'transformed',
        }
      : null,
    getOptimizedUrl(originalRaw, opts)
      ? {
          url: getOptimizedUrl(originalRaw, opts)!,
          bucket,
          sourceUrl: originalRaw,
          deliveryMode: 'transformed',
        }
      : null,
    {
      url: normalizedRaw,
      bucket,
      sourceUrl: normalizedRaw,
      deliveryMode: 'raw-fallback',
    },
    {
      url: originalRaw,
      bucket,
      sourceUrl: originalRaw,
      deliveryMode: 'raw-fallback',
    },
  ].filter((candidate): candidate is ImageCandidate => Boolean(candidate));

  return Array.from(
    new Map(candidates.map((candidate) => [candidate.url, candidate])).values(),
  );
}

export function buildResponsiveSrcSet(
  url: string | null | undefined,
  widths: number[],
  opts: TransformOptions | ImagePreset,
): string | undefined {
  if (!url?.trim() || widths.length === 0) return undefined;
  const rawUrl = toRawSupabaseObjectUrl(url.trim());
  if (!isSupabaseStorageUrl(rawUrl)) return undefined;

  const baseOptions: TransformOptions =
    typeof opts === 'string' ? { ...IMAGE_SIZES[opts] } : { ...opts };

  const entries = widths
    .map((width) => {
      const transformed = getOptimizedUrl(rawUrl, { ...baseOptions, width });
      return transformed ? `${transformed} ${width}w` : null;
    })
    .filter((entry): entry is string => Boolean(entry));

  return entries.length > 0 ? entries.join(', ') : undefined;
}

/**
 * Builds avatar image candidates while preserving the original string array API.
 */
export function getAvatarImageCandidates(
  url: string | null | undefined,
  opts: TransformOptions | ImagePreset = 'AVATAR_MD',
): string[] {
  return getImageCandidates(url, opts).map((candidate) => candidate.url);
}

/**
 * Returns an optimised URL for a Supabase Storage image.
 *
 * - Rewrites `…/object/public/<bucket>/<path>` →
 *   `…/render/image/public/<bucket>/<path>?width=…&quality=…`
 * - Strips any existing `?t=…` cache-buster (no longer needed with
 *   path-based avatar versioning).
 * - Non-Supabase URLs (external CDNs, data URIs, etc.) pass through.
 */
export function getOptimizedUrl(
  url: string | null | undefined,
  opts: TransformOptions | ImagePreset,
): string | undefined {
  if (!url?.trim()) return undefined;

  // Resolve preset name → concrete options
  const options: TransformOptions =
    typeof opts === 'string' ? { ...IMAGE_SIZES[opts] } : opts;

  const rawUrl = toRawSupabaseObjectUrl(url.trim());
  const idx = rawUrl.indexOf(OBJECT_PUBLIC_MARKER);
  if (idx === -1) return url; // external / data URI — passthrough

  const baseOrigin = rawUrl.slice(0, idx);
  // Strip query params (e.g. ?t=…)
  const pathWithQuery = rawUrl.slice(idx + OBJECT_PUBLIC_MARKER.length);
  const cleanPath = stripQuery(pathWithQuery);
  // Image transforms target raster formats; skip /render/image/ for SVG (initials avatars, etc.).
  if (cleanPath.toLowerCase().endsWith('.svg')) {
    return undefined;
  }

  const params = new URLSearchParams();
  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));
  if (options.quality) params.set('quality', String(options.quality));

  return `${baseOrigin}${RENDER_PUBLIC_MARKER}${cleanPath}?${params.toString()}`;
}
