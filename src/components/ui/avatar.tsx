import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { getSupabaseStorageBucket, inferAssetTypeFromBucket, type ImagePreset } from "@/lib/imageUtils";
import {
  captureImageHardFailure,
  detectCacheHint,
  extractImagePath,
  reportImageTelemetry,
} from "@/lib/imageTelemetry";
import { cn } from "@/lib/utils";
import { useImageDelivery } from "./use-image-delivery";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
  avatarPreset?: ImagePreset;
  surface?: string;
};

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, avatarPreset = "AVATAR_MD", onLoadingStatusChange, onError, onLoad, surface, ...props }, ref) => {
  const { advanceCandidate, candidateIndex, hasNextCandidate, resolvedCandidate } = useImageDelivery({
    src: typeof src === "string" ? src : undefined,
    preset: avatarPreset,
  });

  const baseTelemetry = React.useMemo(() => ({
    asset_type: inferAssetTypeFromBucket(getSupabaseStorageBucket(typeof src === "string" ? src : undefined)),
    bucket: resolvedCandidate?.bucket ?? getSupabaseStorageBucket(typeof src === "string" ? src : undefined),
    preset: avatarPreset,
    surface,
    fallback_used: candidateIndex > 0,
    image_path: extractImagePath(resolvedCandidate?.url ?? undefined),
    page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
  }), [avatarPreset, candidateIndex, resolvedCandidate?.bucket, resolvedCandidate?.url, src, surface]);

  const handleLoadingStatusChange = React.useCallback<NonNullable<AvatarImageProps["onLoadingStatusChange"]>>(
    (status) => {
      if (!resolvedCandidate) {
        onLoadingStatusChange?.(status);
        return;
      }

      if (status === "error") {
        reportImageTelemetry({
          ...baseTelemetry,
          delivery_mode: resolvedCandidate.deliveryMode,
          load_status: "error",
          cache_hint: "unknown",
        });

        if (hasNextCandidate) {
          advanceCandidate();
          return;
        }

        captureImageHardFailure({
          ...baseTelemetry,
          delivery_mode: resolvedCandidate.deliveryMode,
          load_status: "error",
          cache_hint: "unknown",
        });
      }

      onLoadingStatusChange?.(status);
    },
    [advanceCandidate, baseTelemetry, hasNextCandidate, onLoadingStatusChange, resolvedCandidate],
  );

  const handleLoad = React.useCallback<NonNullable<AvatarImageProps["onLoad"]>>(
    (event) => {
      if (resolvedCandidate) {
        const loadedUrl = event.currentTarget.currentSrc || resolvedCandidate.url;
        reportImageTelemetry({
          ...baseTelemetry,
          bucket: resolvedCandidate.bucket,
          delivery_mode: resolvedCandidate.deliveryMode,
          load_status: "loaded",
          cache_hint: detectCacheHint(loadedUrl),
          image_path: extractImagePath(loadedUrl),
        });
      }
      onLoad?.(event);
    },
    [baseTelemetry, onLoad, resolvedCandidate],
  );

  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square h-full w-full object-cover", className)}
      src={resolvedCandidate?.url}
      onLoadingStatusChange={handleLoadingStatusChange}
      onLoad={handleLoad}
      onError={onError}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
