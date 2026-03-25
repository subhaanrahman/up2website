import * as React from 'react';
import {
  buildResponsiveSrcSet,
  getImageCandidates,
  type ImageCandidate,
  type ImagePreset,
} from '@/lib/imageUtils';

interface UseImageDeliveryOptions {
  src: string | null | undefined;
  preset: ImagePreset;
  responsiveWidths?: number[];
}

export function useImageDelivery({
  src,
  preset,
  responsiveWidths,
}: UseImageDeliveryOptions) {
  const candidates = React.useMemo<ImageCandidate[]>(
    () => getImageCandidates(src, preset),
    [preset, src],
  );
  const candidatesKey = React.useMemo(
    () => candidates.map((candidate) => candidate.url).join('||'),
    [candidates],
  );
  const [candidateIndex, setCandidateIndex] = React.useState(0);

  React.useEffect(() => {
    setCandidateIndex(0);
  }, [candidatesKey]);

  const resolvedCandidate = candidates[candidateIndex];

  const srcSet = React.useMemo(() => {
    if (!resolvedCandidate || !responsiveWidths?.length) return undefined;
    if (resolvedCandidate.deliveryMode !== 'transformed') return undefined;
    return buildResponsiveSrcSet(resolvedCandidate.sourceUrl, responsiveWidths, preset);
  }, [preset, resolvedCandidate, responsiveWidths]);

  return {
    candidateIndex,
    candidates,
    hasNextCandidate: candidateIndex < candidates.length - 1,
    resolvedCandidate,
    srcSet,
    advanceCandidate() {
      setCandidateIndex((current) => Math.min(current + 1, candidates.length - 1));
    },
  };
}
