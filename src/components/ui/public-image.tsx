import * as React from 'react';
import {
  getSupabaseStorageBucket,
  inferAssetTypeFromBucket,
  type ImageAssetType,
  type ImagePreset,
} from '@/lib/imageUtils';
import {
  captureImageHardFailure,
  detectCacheHint,
  extractImagePath,
  reportImageTelemetry,
} from '@/lib/imageTelemetry';
import { useImageDelivery } from './use-image-delivery';

export interface PublicImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  preset: ImagePreset;
  assetType?: ImageAssetType;
  surface?: string;
  responsiveWidths?: number[];
}

const PublicImage = React.forwardRef<HTMLImageElement, PublicImageProps>(
  (
    {
      src,
      alt,
      preset,
      assetType,
      surface,
      responsiveWidths,
      loading = 'lazy',
      decoding = 'async',
      onError,
      onLoad,
      sizes,
      ...props
    },
    ref,
  ) => {
    const {
      advanceCandidate,
      candidateIndex,
      hasNextCandidate,
      resolvedCandidate,
      srcSet,
    } = useImageDelivery({ src, preset, responsiveWidths });

    const effectiveAssetType = assetType ?? inferAssetTypeFromBucket(getSupabaseStorageBucket(src));

    const baseTelemetry = React.useMemo(() => ({
      asset_type: effectiveAssetType,
      bucket: resolvedCandidate?.bucket ?? getSupabaseStorageBucket(src),
      preset,
      surface,
      fallback_used: candidateIndex > 0,
      image_path: extractImagePath(resolvedCandidate?.url ?? undefined),
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    }), [candidateIndex, effectiveAssetType, preset, resolvedCandidate?.bucket, resolvedCandidate?.url, src, surface]);

    const handleError = React.useCallback<React.ReactEventHandler<HTMLImageElement>>(
      (event) => {
        if (!resolvedCandidate) {
          onError?.(event);
          return;
        }

        reportImageTelemetry({
          ...baseTelemetry,
          delivery_mode: resolvedCandidate.deliveryMode,
          load_status: 'error',
          cache_hint: 'unknown',
        });

        if (hasNextCandidate) {
          advanceCandidate();
          return;
        }

        captureImageHardFailure({
          ...baseTelemetry,
          delivery_mode: resolvedCandidate.deliveryMode,
          load_status: 'error',
          cache_hint: 'unknown',
        });
        onError?.(event);
      },
      [advanceCandidate, baseTelemetry, hasNextCandidate, onError, resolvedCandidate],
    );

    const handleLoad = React.useCallback<React.ReactEventHandler<HTMLImageElement>>(
      (event) => {
        if (resolvedCandidate) {
          const loadedUrl = event.currentTarget.currentSrc || resolvedCandidate.url;
          reportImageTelemetry({
            ...baseTelemetry,
            bucket: resolvedCandidate.bucket,
            delivery_mode: resolvedCandidate.deliveryMode,
            load_status: 'loaded',
            cache_hint: detectCacheHint(loadedUrl),
            image_path: extractImagePath(loadedUrl),
          });
        }
        onLoad?.(event);
      },
      [baseTelemetry, onLoad, resolvedCandidate],
    );

    if (!resolvedCandidate) return null;

    return (
      <img
        ref={ref}
        src={resolvedCandidate.url}
        srcSet={srcSet}
        sizes={resolvedCandidate.deliveryMode === 'transformed' ? sizes : undefined}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    );
  },
);

PublicImage.displayName = 'PublicImage';

export { PublicImage };
