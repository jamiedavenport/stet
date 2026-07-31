import { crc32, deflateSync } from 'node:zlib';

// Cover art for the seeded posts, drawn here rather than committed as binary
// files: the repository stays text, and a cover is a calm gradient at any
// size the app asks for.

export type Rgb = readonly [number, number, number];

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

/** A truecolour PNG, one call to `pixel` per pixel. */
function encodePng(
  width: number,
  height: number,
  pixel: (x: number, y: number) => Rgb,
): Uint8Array {
  const stride = width * 3;
  // One filter byte per row; 0 means "no filter", which deflate handles well
  // on the smooth gradients below.
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (stride + 1);
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y);
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour, no alpha

  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

/**
 * A cover image: a diagonal ramp from `from` to `to`, lifted by a soft
 * highlight up and to the left so the result reads as lit rather than flat.
 */
export function coverImage(from: Rgb, to: Rgb, width = 1200, height = 630): Uint8Array {
  const glowX = width * 0.28;
  const glowY = height * 0.3;
  const glowRadius = width * 0.62;

  return encodePng(width, height, (x, y) => {
    const ramp = (x / width) * 0.65 + (y / height) * 0.35;
    const distance = Math.hypot(x - glowX, y - glowY) / glowRadius;
    const glow = Math.max(0, 1 - distance) ** 2 * 26;
    return [
      clamp(from[0] + (to[0] - from[0]) * ramp + glow),
      clamp(from[1] + (to[1] - from[1]) * ramp + glow),
      clamp(from[2] + (to[2] - from[2]) * ramp + glow),
    ];
  });
}
