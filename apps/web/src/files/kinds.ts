// The upload flows the app offers. The browser, the createUpload guard, and
// the serving route all read their limits from here.

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Who an asset belongs to, which decides who can read it. */
export type AssetScope = 'organization' | 'user';

type AssetKindConfig = {
  scope: AssetScope;
  contentTypes: readonly string[];
  maxBytes: number;
};

export const assetKinds = {
  avatar: {
    scope: 'user',
    contentTypes: imageTypes,
    maxBytes: 2 * 1024 * 1024,
  },
  'body-image': {
    scope: 'organization',
    // GIF only here: avatars are rendered at a size where animation is noise.
    contentTypes: [...imageTypes, 'image/gif'],
    maxBytes: 5 * 1024 * 1024,
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

/** The `accept` attribute for a file input offering this kind. */
export function acceptAttribute(kind: AssetKind): string {
  return assetKinds[kind].contentTypes.join(',');
}
