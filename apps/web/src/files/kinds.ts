// The upload flows the app offers. The browser, the createUpload guard, and
// the serving routes all read their limits from here.

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Who an asset belongs to, which decides who can read it. */
export type AssetScope = 'organization' | 'user';

/**
 * Where an asset is served from. `public` kinds are content: they end up in
 * the customer's published pages, so they serve from /assets/<id> with no
 * session, on the unguessable id alone. `private` kinds serve only to people
 * who pass `canReadAsset`.
 */
export type AssetDelivery = 'public' | 'private';

type AssetKindConfig = {
  scope: AssetScope;
  delivery: AssetDelivery;
  contentTypes: readonly string[];
  maxBytes: number;
};

export const assetKinds = {
  avatar: {
    scope: 'user',
    delivery: 'private',
    contentTypes: imageTypes,
    maxBytes: 2 * 1024 * 1024,
  },
  'body-image': {
    scope: 'organization',
    delivery: 'public',
    // GIF only here: avatars are rendered at a size where animation is noise.
    contentTypes: [...imageTypes, 'image/gif'],
    maxBytes: 5 * 1024 * 1024,
  },
  // What an asset field holds. Wider than the image kinds: an entry's
  // attachment is as likely to be a PDF as a picture.
  'content-asset': {
    scope: 'organization',
    delivery: 'public',
    contentTypes: [
      ...imageTypes,
      'image/gif',
      'image/avif',
      'application/pdf',
      'video/mp4',
      'audio/mpeg',
    ],
    maxBytes: 25 * 1024 * 1024,
  },
} as const satisfies Record<string, AssetKindConfig>;

export type AssetKind = keyof typeof assetKinds;

export function isAssetKind(value: string): value is AssetKind {
  return Object.hasOwn(assetKinds, value);
}

export function acceptsContentType(kind: AssetKind, contentType: string): boolean {
  return (assetKinds[kind].contentTypes as readonly string[]).includes(contentType);
}

export function acceptsSize(kind: AssetKind, size: number): boolean {
  return size > 0 && size <= assetKinds[kind].maxBytes;
}

/** Whether an asset of this kind serves without a session. */
export function isPubliclyDelivered(kind: string): boolean {
  return isAssetKind(kind) && assetKinds[kind].delivery === 'public';
}

/** The `accept` attribute for a file input offering this kind. */
export function acceptAttribute(kind: AssetKind): string {
  return assetKinds[kind].contentTypes.join(',');
}
