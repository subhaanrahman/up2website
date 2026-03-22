/**
 * Supabase Storage CDN image utilities.
 *
 * Converts `/object/public/…` URLs to `/render/image/public/…` transform
 * endpoints so the CDN serves correctly-sized, compressed images.
 *
 * External URLs (Tenor GIFs, Giphy, etc.) are returned untouched.
 */

import { config } from '@/infrastructure/config';

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
  /** Event card thumbnails */
  EVENT_CARD: { width: 400, quality: 75 },
  /** Feed post images / inline media */
  FEED_IMAGE: { width: 600, quality: 80 },
  /** Event detail hero & full-bleed images */
  EVENT_HERO: { width: 1200, quality: 85 },
} as const;

export type ImagePreset = keyof typeof IMAGE_SIZES;

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
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
  if (!url) return undefined;

  // Resolve preset name → concrete options
  const options: TransformOptions =
    typeof opts === 'string' ? { ...IMAGE_SIZES[opts] } : opts;

  // Only transform Supabase storage URLs
  const storageMarker = '/storage/v1/object/public/';
  const idx = url.indexOf(storageMarker);
  if (idx === -1) return url; // external / data URI — passthrough

  const baseOrigin = url.slice(0, idx);
  // Strip query params (e.g. ?t=…)
  const pathWithQuery = url.slice(idx + storageMarker.length);
  const cleanPath = pathWithQuery.split('?')[0];

  const params = new URLSearchParams();
  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));
  if (options.quality) params.set('quality', String(options.quality));

  return `${baseOrigin}/storage/v1/render/image/public/${cleanPath}?${params.toString()}`;
}
