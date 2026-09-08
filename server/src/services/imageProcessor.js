import sharp from 'sharp';

// Output variants. Widths are the *maximum* — smaller sources are never upscaled.
export const VARIANTS = [
  { name: 'thumbnail', maxWidth: 300, quality: 72 }, // admin / list rows
  { name: 'card', maxWidth: 800, quality: 78 }, // product grids
  { name: 'detail', maxWidth: 1600, quality: 82 }, // product detail page
];

// AVIF can be added here later (e.g. { format: 'avif', quality: 55 }); the
// controller/serializer already key files by `${name}.${ext}` so it's additive.
export const PRIMARY_FORMAT = { ext: 'webp', contentType: 'image/webp' };

const ACCEPTED_INPUT = new Set(['jpeg', 'png']);
const MAX_INPUT_DIMENSION = 10000; // guards against decompression-bomb style inputs

export class ImageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageError';
    this.code = 'IMAGE_INVALID';
  }
}

/**
 * Validate an uploaded image buffer and produce optimised WebP variants.
 * - confirms the bytes are really a JPEG/PNG (not just a trusting extension)
 * - applies EXIF orientation, then strips all metadata (sharp default)
 * - resizes preserving aspect ratio, never enlarging
 * @returns {{ originalWidth:number, originalHeight:number, variants: Array }}
 */
export async function processImage(buffer) {
  if (!buffer || !buffer.length) throw new ImageError('Empty file');

  let meta;
  try {
    meta = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new ImageError('File is not a readable image');
  }

  if (!meta.format || !ACCEPTED_INPUT.has(meta.format)) {
    throw new ImageError('Only JPEG or PNG images are accepted');
  }
  if (!meta.width || !meta.height) {
    throw new ImageError('Could not read image dimensions');
  }
  if (meta.width > MAX_INPUT_DIMENSION || meta.height > MAX_INPUT_DIMENSION) {
    throw new ImageError(`Image must be at most ${MAX_INPUT_DIMENSION}px on each side`);
  }

  // Orientation-corrected source dimensions (EXIF rotation swaps w/h)
  const oriented = await sharp(buffer).rotate().metadata();
  const srcWidth = oriented.width;
  const srcHeight = oriented.height;

  const variants = [];
  for (const v of VARIANTS) {
    const targetWidth = Math.min(v.maxWidth, srcWidth); // no upscaling
    const out = await sharp(buffer, { failOn: 'error' })
      .rotate() // auto-orient from EXIF
      .resize({ width: targetWidth, withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: v.quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    variants.push({
      name: v.name,
      ext: PRIMARY_FORMAT.ext,
      contentType: PRIMARY_FORMAT.contentType,
      buffer: out.data,
      width: out.info.width,
      height: out.info.height,
      size: out.info.size,
    });
  }

  return { originalWidth: srcWidth, originalHeight: srcHeight, variants };
}
