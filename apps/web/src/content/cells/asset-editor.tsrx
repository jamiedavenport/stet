import { useRef, useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { UploadSimpleIcon } from '@phosphor-icons/react';

import { acceptAttribute, acceptsContentType, acceptsSize, assetKinds } from '#/files/kinds';
import { uploadFile } from '#/files/upload';
import { imageSrc, publicAssetUrl } from '#/files/urls';

type AssetEditorProps = {
  /** The held asset, or null when the field is empty. */
  asset: { id: string; name: string; contentType: string } | null;
  onPick: (assetId: string) => Promise<void>;
  onClear: () => void;
};

const maxMegabytes = Math.round(assetKinds['content-asset'].maxBytes / (1024 * 1024));

/**
 * Upload-and-hold editor for asset cells. Uploads go straight into the
 * organization's storage and the field holds the asset's id, so the same file
 * can be pointed at by several entries.
 */
export function AssetEditor(props: AssetEditorProps) @{
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!acceptsContentType('content-asset', file.type)) {
      setError(`${file.type || 'That file type'} is not accepted here.`);
      return;
    }
    if (!acceptsSize('content-asset', file.size)) {
      setError(`Files are limited to ${maxMegabytes} MB.`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFile('content-asset', file);
      await props.onPick(uploaded.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The upload failed.');
    } finally {
      setUploading(false);
    }
  };

  <div className="flex flex-col gap-2">
    @if (props.asset !== null) {
      <div className="flex items-center gap-2">
        @if (props.asset.contentType.startsWith('image/')) {
          <img
            src={imageSrc(publicAssetUrl(props.asset.id), 96)}
            alt={props.asset.name}
            className="size-12 rounded-md border object-cover"
          />
        }
        <span className="flex-1 truncate text-sm">{props.asset.name}</span>
      </div>
    }
    <input
      ref={inputRef}
      type="file"
      className="sr-only"
      accept={acceptAttribute('content-asset')}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file !== undefined) {
          void upload(file);
        }
      }}
    />
    <Button
      variant="outline"
      size="sm"
      disabled={uploading}
      onClick={() => inputRef.current?.click()}
    >
      <UploadSimpleIcon className="size-4" />
      {uploading ? "Uploading…" : props.asset === null ? "Upload a file" : "Replace"}
    </Button>
    @if (props.asset !== null) {
      <Button variant="ghost" size="sm" className="justify-start" onClick={props.onClear}>
        {"Clear"}
      </Button>
    }
    @if (error !== null) {
      <p className="text-sm text-destructive">{error}</p>
    }
  </div>
}
