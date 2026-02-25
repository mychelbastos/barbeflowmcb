import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

/**
 * Compresses a raw image (PNG/JPEG) to JPEG at target size (~20-30KB).
 * Resizes to maxWidth and encodes with adjustable quality.
 */
export async function compressImage(
  imageBytes: Uint8Array,
  opts?: { maxWidth?: number; quality?: number }
): Promise<{ data: Uint8Array; mimeType: string; ext: string }> {
  const maxWidth = opts?.maxWidth ?? 600;
  const quality = opts?.quality ?? 65;

  let img = await Image.decode(imageBytes);

  // Resize if wider than maxWidth, keeping aspect ratio
  if (img.width > maxWidth) {
    const ratio = maxWidth / img.width;
    const newHeight = Math.round(img.height * ratio);
    img = img.resize(maxWidth, newHeight);
  }

  const jpegData = await img.encodeJPEG(quality);

  return {
    data: new Uint8Array(jpegData),
    mimeType: "image/jpeg",
    ext: "jpeg",
  };
}
