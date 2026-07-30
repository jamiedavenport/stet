import { createUpload } from '#/files/create-upload';
import type { AssetKind } from '#/files/kinds';

export type UploadedAsset = {
  id: string;
  /** Where to render or link the asset from. */
  url: string;
};

/**
 * Uploads a file and resolves once its bytes are stored. Callers should reject
 * obviously bad files against `#/files/kinds` first, so a mistake surfaces
 * without a round trip.
 */
export async function uploadFile(kind: AssetKind, file: File): Promise<UploadedAsset> {
  const { id, uploadUrl, url } = await createUpload({
    data: { kind, name: file.name, contentType: file.type, size: file.size },
  });

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}).`);
  }

  return { id, url };
}
