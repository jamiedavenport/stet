import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { seedAsset, seedAuthors, seedOrganization, seedUser } from '@repo/db/seed-data';

import { onePagePdf } from './pdf';
import { coverImage } from './png';
import type { Rgb } from './png';

export type SeedAsset = {
  id: string;
  name: string;
  /** An upload kind from apps/web's registry; `content-asset` files serve publicly. */
  kind: string;
  contentType: string;
  uploadedBy: string;
  /** Rendered once, on demand: importing this module for the ids stays cheap. */
  bytes: () => Uint8Array;
};

function once(build: () => Uint8Array): () => Uint8Array {
  let rendered: Uint8Array | undefined;
  return () => (rendered ??= build());
}

const [nadia, tomas, priya] = seedAuthors;

const cover = (topic: string, uploadedBy: string, from: Rgb, to: Rgb): SeedAsset => ({
  id: `seed-asset-cover-${topic}`,
  name: `${topic}-cover.png`,
  kind: 'content-asset',
  contentType: 'image/png',
  uploadedBy,
  bytes: once(() => coverImage(from, to)),
});

/** One cover per topic, so a post's art and its Topic option always agree. */
export const covers = {
  engineering: cover('engineering', tomas.id, [0x1b, 0x24, 0x30], [0x3f, 0x6b, 0x9e]),
  design: cover('design', nadia.id, [0x22, 0x1c, 0x2e], [0x6b, 0x5a, 0x95]),
  process: cover('process', priya.id, [0x17, 0x24, 0x1d], [0x4a, 0x7a, 0x5c]),
  writing: cover('writing', nadia.id, [0x2a, 0x20, 0x18], [0x9a, 0x6f, 0x42]),
};

export const seedAssets: SeedAsset[] = [
  ...Object.values(covers),
  {
    id: seedAsset.id,
    name: seedAsset.name,
    kind: 'content-asset',
    contentType: 'application/pdf',
    uploadedBy: seedUser.id,
    bytes: once(() =>
      onePagePdf('Quarterly report', [
        'Readership, publishing cadence, and where the traffic came from.',
        '',
        'Posts published: 10',
        'Median time on page: 3m 12s',
        'Referrers: search 54%, direct 31%, social 15%',
      ]),
    ),
  },
];

/** Where an upload of this kind would have put its bytes (see apps/web's assetKey). */
export function assetKey(id: string): string {
  return `orgs/${seedOrganization.id}/${id}`;
}

// Named in apps/web/wrangler.jsonc; there is no helper that derives an R2
// binding from it the way D1Helper does for the database.
const bucket = 'stet-storage';

/**
 * Puts every seeded file into the local R2 bucket miniflare serves from, so
 * covers render and the attachment downloads. Goes through wrangler rather
 * than writing its state directly, and one file at a time: concurrent puts
 * race each other's writes to the bucket index and silently drop objects.
 */
export function writeAssetBytes(webDir: string, report: (line: string) => void): void {
  const wrangler = path.join(webDir, 'node_modules/.bin/wrangler');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stet-seed-'));
  try {
    for (const asset of seedAssets) {
      const file = path.join(directory, asset.id);
      fs.writeFileSync(file, asset.bytes());
      report(`Uploading ${asset.name}`);
      run(wrangler, webDir, [
        'r2',
        'object',
        'put',
        `${bucket}/${assetKey(asset.id)}`,
        '--file',
        file,
        '--content-type',
        asset.contentType,
        '--local',
      ]);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function run(command: string, cwd: string, args: string[]): void {
  try {
    execFileSync(command, args, { cwd, stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (cause) {
    const stderr = (cause as { stderr?: Buffer }).stderr?.toString().trim();
    throw new Error(
      `Writing seed files to the local ${bucket} bucket failed. The database is already ` +
        `seeded; start \`vp dev\` once and reseed to retry.\n${stderr ?? String(cause)}`,
    );
  }
}
