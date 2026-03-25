import { describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/config", () => ({
  config: {
    supabase: {
      url: "https://fxcosnsbaaktblmnvycv.supabase.co",
    },
  },
}));

import {
  getAvatarImageCandidates,
  getOptimizedUrl,
  normalizeSupabaseStorageUrlToProject,
} from "./imageUtils";

describe("imageUtils", () => {
  it("rewrites legacy Supabase storage hosts to the current project", () => {
    expect(
      normalizeSupabaseStorageUrlToProject(
        "https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/u1/avatar.jpeg?t=123",
      ),
    ).toBe(
      "https://fxcosnsbaaktblmnvycv.supabase.co/storage/v1/object/public/avatars/u1/avatar.jpeg?t=123",
    );
  });

  it("converts Supabase object URLs to transformed render URLs and strips cache busters", () => {
    expect(
      getOptimizedUrl(
        "https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/u1/avatar.jpeg?t=123",
        "AVATAR_MD",
      ),
    ).toBe(
      "https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/render/image/public/avatars/u1/avatar.jpeg?width=128&quality=80",
    );
  });

  it("builds avatar candidates that prefer the current project but preserve the original fallback", () => {
    expect(
      getAvatarImageCandidates(
        "https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/u1/avatar.jpeg?t=123",
      ),
    ).toEqual([
      "https://fxcosnsbaaktblmnvycv.supabase.co/storage/v1/render/image/public/avatars/u1/avatar.jpeg?width=128&quality=80",
      "https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/render/image/public/avatars/u1/avatar.jpeg?width=128&quality=80",
      "https://fxcosnsbaaktblmnvycv.supabase.co/storage/v1/object/public/avatars/u1/avatar.jpeg?t=123",
      "https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/u1/avatar.jpeg?t=123",
    ]);
  });

  it("passes external URLs through without inventing Supabase variants", () => {
    expect(getAvatarImageCandidates("https://images.example.com/avatar.png")).toEqual([
      "https://images.example.com/avatar.png",
    ]);
  });

  it("does not use image transform URLs for SVG storage paths", () => {
    expect(
      getOptimizedUrl(
        "https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/u1/initials.svg",
        "AVATAR_MD",
      ),
    ).toBeUndefined();
  });

  it("builds SVG avatar candidates from raw object URLs only (no /render/image/)", () => {
    expect(
      getAvatarImageCandidates(
        "https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/u1/initials.svg",
      ),
    ).toEqual([
      "https://fxcosnsbaaktblmnvycv.supabase.co/storage/v1/object/public/avatars/u1/initials.svg",
      "https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/u1/initials.svg",
    ]);
  });

  it("returns no candidates for nullish or empty input", () => {
    expect(getAvatarImageCandidates(null)).toEqual([]);
    expect(getAvatarImageCandidates("   ")).toEqual([]);
    expect(getOptimizedUrl(undefined, "AVATAR_SM")).toBeUndefined();
  });
});
