// Generate an initials-based SVG avatar and upload to the avatars bucket.
// Returns the public URL of the uploaded avatar.

import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getPublicStorageUrl } from "./image-upload.ts";

/** Deterministic colour from a string (hue 0-360). */
function hashHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
}

function buildSvg(initials: string, hue: number): string {
  const bg = `hsl(${hue}, 45%, 35%)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" fill="${bg}" rx="128"/>
  <text x="128" y="128" dy=".1em" fill="white" font-size="96"
        text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="600">${initials}</text>
</svg>`;
}

/**
 * Generate an initials avatar and upload to the `avatars` storage bucket.
 * @returns Public URL of the uploaded avatar.
 */
export async function generateAndUploadInitialsAvatar(
  adminClient: SupabaseClient,
  storagePrefix: string,
  displayName: string,
): Promise<string> {
  const initials = getInitials(displayName);
  const hue = hashHue(storagePrefix);
  const svg = buildSvg(initials, hue);
  const blob = new Blob([svg], { type: "image/svg+xml" });

  const filePath = `${storagePrefix}/initials.svg`;

  // Upload (upsert so re-registration or profile edits overwrite)
  const { error: uploadError } = await adminClient.storage
    .from("avatars")
    .upload(filePath, blob, {
      contentType: "image/svg+xml",
      upsert: true,
    });

  if (uploadError) {
    console.error("Initials avatar upload error:", uploadError);
    throw uploadError;
  }

  return getPublicStorageUrl(adminClient, "avatars", filePath);
}
