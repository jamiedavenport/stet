import { images } from '#/storage';

const imageFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'] as const;

type ImageFormat = (typeof imageFormats)[number];

const fitModes = ['scale-down', 'contain', 'cover', 'crop', 'pad'] as const;

type Fit = (typeof fitModes)[number];

export type Transform = {
  width?: number;
  height?: number;
  fit?: Fit;
  format: ImageFormat;
};

/** A type the Images binding can read and write, and a browser renders inline. */
export function isImageFormat(value: string): value is ImageFormat {
  return (imageFormats as readonly string[]).includes(value);
}

// Bounded so a crafted URL cannot ask the binding for an enormous canvas.
const maxDimension = 4000;

function dimension(raw: string | null): number | undefined {
  if (raw === null) {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > maxDimension) {
    return undefined;
  }
  return value;
}

/**
 * The transform a request is asking for, or null for the stored bytes.
 * Unrecognised values are dropped rather than rejected, so a stale or
 * hand-edited URL still serves the image.
 */
export function parseTransform(params: URLSearchParams, contentType: string): Transform | null {
  if (!isImageFormat(contentType)) {
    return null;
  }

  const width = dimension(params.get('w'));
  const height = dimension(params.get('h'));
  const requested = params.get('format');
  const format =
    requested !== null && isImageFormat(`image/${requested}`)
      ? (`image/${requested}` as ImageFormat)
      : contentType;
  const rawFit = params.get('fit');
  const fit = (fitModes as readonly string[]).includes(rawFit ?? '') ? (rawFit as Fit) : undefined;

  if (width === undefined && height === undefined && format === contentType) {
    return null;
  }
  return { width, height, fit, format };
}

/** Applies a transform, or null if the binding rejects the image. Consumes `body`. */
export async function applyTransform(
  body: ReadableStream,
  transform: Transform,
): Promise<Response | null> {
  const { format, ...options } = transform;
  try {
    const result = await images
      .input(body as ReadableStream<Uint8Array>)
      .transform(options)
      .output({ format });
    return result.response();
  } catch (error) {
    console.error('[files] Image transform failed, serving the original:', error);
    return null;
  }
}
