const SUPABASE_STORAGE_DOMAIN = 'iagzodcwctvydmgrwjsy.supabase.co/storage';

/**
 * Returns an optimized image URL using Supabase Storage Image Transformations.
 * Falls back to original URL if not a Supabase Storage URL.
 * 
 * Requires Supabase Pro plan for image transformations.
 * If transforms aren't available, the original URL is returned unchanged.
 */
export function optimizedImageUrl(
  url: string | null | undefined,
  width: number,
  quality: number = 75
): string {
  if (!url) return '';
  
  // Only transform Supabase Storage URLs
  if (!url.includes(SUPABASE_STORAGE_DOMAIN)) return url;
  
  // Convert /object/public/ to /render/image/public/ and add params
  if (url.includes('/object/public/')) {
    return url.replace('/object/public/', '/render/image/public/') + 
      `?width=${width}&quality=${quality}`;
  }
  
  // If already a render URL, just update params
  if (url.includes('/render/image/public/')) {
    const base = url.split('?')[0];
    return `${base}?width=${width}&quality=${quality}`;
  }
  
  return url;
}
