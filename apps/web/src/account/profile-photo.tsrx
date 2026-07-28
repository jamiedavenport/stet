import { type ChangeEvent, useRef, useState } from 'react';
import { m } from '@repo/i18n/messages';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';
import { useRouter } from '@tanstack/react-router';

import { useAppRoute } from '#/use-app-route';
import { removeAvatar, setAvatar } from '#/account/avatar';
import { imageSrc } from '#/files/urls';
import { acceptAttribute, acceptsContentType, acceptsSize } from '#/files/kinds';
import { uploadFile } from '#/files/upload';
import { initials } from '#/initials';
import { clearSessionContext } from '#/session';

export function ProfilePhoto() @{
  const { user } = useAppRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirrors the server-side checks so obvious mistakes fail before the upload
  // round-trip; the server stays the source of truth.
  const validateFile = (file: File): string | null => {
    if (!acceptsContentType('avatar', file.type)) {
      return m.choose_a_jpeg_png_or_webp();
    }
    if (!acceptsSize('avatar', file.size)) {
      return m.choose_an_image_2_mb_or();
    }
    return null;
  };

  const onFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    // Reset so selecting the same file again still fires a change event.
    event.target.value = '';
    if (file === null) {
      return;
    }

    const problem = validateFile(file);
    if (problem !== null) {
      setError(problem);
      return;
    }

    setError(null);
    setPending(true);
    try {
      const { id } = await uploadFile('avatar', file);
      await setAvatar({ data: { id } });
      clearSessionContext(queryClient);
      await router.invalidate();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : m.upload_failed());
    } finally {
      setPending(false);
    }
  };

  const onRemove = async () => {
    setError(null);
    setPending(true);
    try {
      await removeAvatar();
      clearSessionContext(queryClient);
      await router.invalidate();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : m.remove_failed());
    } finally {
      setPending(false);
    }
  };

  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16">
        <AvatarImage src={imageSrc(user.image, 128)} alt="" />
        <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? m.working() : m.upload_photo()}
          </Button>
          @if (typeof user.image === 'string') {
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => void onRemove()}
            >
              {m.remove()}
            </Button>
          }
        </div>
        <p className="text-xs text-muted-foreground">{m.jpeg_png_or_webp_up_to()}</p>
      </div>
    </div>
    <input
      ref={inputRef}
      type="file"
      accept={acceptAttribute('avatar')}
      className="sr-only"
      aria-label={m.choose_profile_photo()}
      onChange={(event) => void onFileSelected(event)}
    />
    @if (error !== null) {
      <FieldError>{error}</FieldError>
    }
  </div>
}
