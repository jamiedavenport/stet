import { describe, expect, it } from 'vite-plus/test';
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs';

import { bumpContentVersion, observeContentVersion } from './version';

/** A bump arriving over the wire, the way the room sends one. */
function receive(watcher: Doc, room: Doc): void {
  applyUpdate(watcher, encodeStateAsUpdate(room), 'room');
}

describe('the content version', () => {
  it('reaches every page open on the room', () => {
    const watcher = new Doc();
    const room = new Doc();
    let bumps = 0;
    observeContentVersion(watcher, () => {
      bumps += 1;
    });

    bumpContentVersion(room);
    receive(watcher, room);
    bumpContentVersion(room);
    receive(watcher, room);

    expect(bumps).toBe(2);
  });

  it('stops when its watcher does', () => {
    const watcher = new Doc();
    const room = new Doc();
    let bumps = 0;
    const stop = observeContentVersion(watcher, () => {
      bumps += 1;
    });

    stop();
    bumpContentVersion(room);
    receive(watcher, room);

    expect(bumps).toBe(0);
  });
});
