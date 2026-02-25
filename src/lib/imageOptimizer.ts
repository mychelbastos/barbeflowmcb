/**
 * Returns an optimized image URL using wsrv.nl free image proxy.
 * Converts to WebP, resizes, and caches automatically.
 *
 * wsrv.nl is a free, open-source image CDN/proxy.
 * - Resizes to specified width
 * - Converts to WebP (97%+ browser support)
 * - Caches results globally
 * - Handles errors gracefully (returns transparent placeholder)
 */
export function optimizedImageUrl(
  url: string | null | undefined,
  width: number,
  quality: number = 75
): string {
  if (!url) return '';

  // Only optimize remote URLs (skip data URIs, blobs, local files)
  if (!url.startsWith('http')) return url;

  // Use wsrv.nl proxy for resizing + WebP conversion
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp&default=1`;
}
