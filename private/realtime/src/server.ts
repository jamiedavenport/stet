import { createLogger } from '@repo/logging';
import * as Sentry from '@sentry/cloudflare';
import { YServer } from 'y-partyserver';
import { applyUpdate, encodeStateAsUpdate } from 'yjs';
import type { Doc } from 'yjs';

import { loadDocumentState, parseRoomName, saveDocument, syncEntryBodyText } from './document';
import type { DocumentRoom } from './document';

const storageKey = 'ydoc';

// How long edits collect before the document is mirrored to D1. The Durable
// Object's own storage is written on every save (see callbackOptions below);
// this is the cadence of the durable copy, and so the most the database can
// trail the live room by.
const flushDelayMs = 5_000;

// One Durable Object per `${organizationId}:${page}` room. YServer speaks the
// Yjs sync + awareness protocols over WebSockets: presence is the awareness
// states of connected clients, and the shared Y.Doc carries page state (the
// notes document). The doc snapshot lives in the DO's SQLite storage so
// state survives hibernation and restarts, and is mirrored to D1 so it also
// survives the Durable Object itself and can be read outside a session.
export class PagePresenceRoom extends YServer {
  static callbackOptions = {
    debounceWait: 1_000,
    debounceMaxWait: 5_000,
  };

  async onLoad(): Promise<void> {
    const stored = await this.ctx.storage.get<Uint8Array>(storageKey);
    if (stored !== undefined) {
      applyUpdate(this.document, stored);
      return;
    }

    // Nothing local: either this room has never been used, or its storage is
    // gone (a reset or a migrated Durable Object). D1 is what makes the
    // difference recoverable.
    const saved = await loadDocumentState(this.room());
    if (saved !== null) {
      applyUpdate(this.document, saved.state);
    }
  }

  // Called on a debounce from the document's own update events, so it only
  // runs for rooms that carry shared state; presence-only pages never reach
  // it. Errors here are swallowed by y-partyserver, which is why the D1 write
  // happens on the alarm instead.
  async onSave(): Promise<void> {
    await this.ctx.storage.put(storageKey, encodeStateAsUpdate(this.document));

    // A due-but-unfired alarm is one the runtime has abandoned (it retries a
    // throwing handler at most six times, and what getAlarm() reports after
    // that is undefined). Trusting it would leave the room never flushing
    // again, so re-arm over anything not strictly in the future.
    const pending = await this.ctx.storage.getAlarm();
    if (pending === null || pending <= Date.now()) {
      await this.ctx.storage.setAlarm(Date.now() + flushDelayMs);
    }
  }

  // Internal document access for off-session writes (see `updateDocument` in
  // document.ts). Unreachable from outside: the worker only ever forwards
  // WebSocket upgrades to this object, so plain HTTP exists solely for
  // server code holding the binding.
  async onRequest(request: Request): Promise<Response> {
    if (new URL(request.url).pathname === '/document') {
      if (request.method === 'GET') {
        // slice() narrows the buffer to ArrayBuffer, which BodyInit wants.
        return new Response(encodeStateAsUpdate(this.document).slice());
      }
      if (request.method === 'PUT') {
        // Applying to the live doc broadcasts to connected editors and arms
        // the same save/flush path as any client edit.
        applyUpdate(this.document, new Uint8Array(await request.arrayBuffer()));
        return new Response(null, { status: 204 });
      }
    }
    return super.onRequest(request);
  }

  // For the host app to run its own work on each flush (entry revisions, in
  // apps/web). A hook rather than an import because the packages that read
  // documents depend on this one, so the flush cannot call them directly.
  protected async onFlush(_room: DocumentRoom, _doc: Doc): Promise<void> {}

  async onAlarm(): Promise<void> {
    const room = this.room();
    const log = createLogger({
      organization: { id: room.organizationId },
      document: { page: room.page },
    });

    try {
      log.set({ document: { bytes: await saveDocument(room, this.document) } });
      await syncEntryBodyText(room, this.document);
      await this.onFlush(room, this.document);
    } catch (error) {
      // Swallowed so the next attempt is the alarm set here rather than the
      // runtime's capped retry; captureException because nothing else would
      // report it.
      Sentry.captureException(error);
      log.error(error instanceof Error ? error : String(error));
      await this.ctx.storage.setAlarm(Date.now() + flushDelayMs);
    } finally {
      log.emit();
    }
  }

  private room(): DocumentRoom {
    const room = parseRoomName(this.name);
    if (room === null) {
      throw new Error(`Room ${this.name} is not named "organizationId:page".`);
    }
    return room;
  }
}
