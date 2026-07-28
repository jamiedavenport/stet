import { database, eq, schema } from '@repo/db';
import { notify } from '@repo/notifications/client';
import { loadDocument } from '@repo/realtime/document';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { countWords, getNotesFragment, notesPage, notesText } from '#/notes/doc';
import { organizationMiddleware } from '#/session';

const mentionInput = z.object({ userId: z.string() });

/**
 * Notifies a member that they were mentioned in the shared notes.
 *
 * The mentioned id is not trusted: the recipient selector is scoped to the
 * caller's organization, so expandRecipients drops any id that is not a
 * member of it.
 */
export const notifyMention = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator((data: unknown) => mentionInput.parse(data))
  .handler(async ({ data, context }) => {
    const actor = context.session.user;
    if (data.userId === actor.id) {
      return;
    }

    const db = await database();
    const organization = await db.query.organization.findFirst({
      where: eq(schema.organization.id, context.organizationId),
    });
    if (organization === undefined) {
      return;
    }

    // Best effort, like the member-joined hook: a queue hiccup must never
    // surface as a failed edit in the editor.
    try {
      await notify({
        type: 'mentioned-in-notes',
        to: {
          organizationId: context.organizationId,
          users: [data.userId],
          except: [actor.id],
        },
        payload: { mentionedByName: actor.name, organizationName: organization.name },
      });
    } catch (error) {
      console.error(`[notes] Failed to enqueue mention notification:`, error);
    }
  });

/**
 * The note as the database has it, read without joining the room.
 *
 * This is the whole point of persisting to D1: the note is available to
 * anything running server-side, not only to a client holding a WebSocket. It
 * trails the live document by up to one flush interval, which is exactly what
 * a "last saved" indicator should report.
 */
const savedNote = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => {
    const saved = await loadDocument({ organizationId: context.organizationId, page: notesPage });
    if (saved === null) {
      return { savedAt: null, words: 0 };
    }

    return {
      savedAt: saved.updatedAt.toISOString(),
      words: countWords(notesText(getNotesFragment(saved.doc))),
    };
  });

export const savedNoteQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['saved-note', organizationId],
    queryFn: () => savedNote(),
    // The room flushes on its own schedule, so this polls rather than waiting
    // for something to invalidate it.
    refetchInterval: 10_000,
  });
