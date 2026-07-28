import { seedOrganization } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import { gotoHydrated } from './helpers';

const originHeader = { origin: process.env.E2E_BASE_URL ?? 'http://localhost:3000' };

// The room mirrors the document to D1 on a delay (see PagePresenceRoom), so
// the API is polled rather than read once after typing.
const flushTimeout = 20_000;

// One document per organization, so parallel tests would type into each
// other's note.
test.describe.configure({ mode: 'serial' });

// Runs in the "app" project with the seeded user's storage state. The editor
// binds to the shared Y.Doc, which nothing outside a WebSocket session can
// see: reading the text back through an API key is only possible because the
// room persists the document to the database.
test('the shared note reaches the database and comes back', async ({ page, request }) => {
  // Two waits on the room's flush and a reload that resyncs the document, all
  // of which stretch under a loaded suite.
  test.setTimeout(120_000);
  const sentence = `Persisted at ${Date.now()}.`;

  await gotoHydrated(page, '/app/notes');
  const editor = page.getByLabel('Notes editor');
  await editor.click();
  await editor.pressSequentially(sentence);

  const created = await request.post('/api/auth/api-key/create', {
    data: { name: 'e2e-notes-key', organizationId: seedOrganization.id },
    headers: originHeader,
  });
  expect(created.status()).toBe(200);
  const { key } = (await created.json()) as { key: string };

  // Polling for this sentence, not just for any saved row: the note is shared
  // and long-lived, so an earlier run's flush would satisfy a weaker check.
  await expect
    .poll(
      async () => {
        const response = await request.get('/api/v1/org/notes', {
          headers: { 'x-api-key': key },
        });
        expect(response.status()).toBe(200);
        return (await response.json()) as { text: string | null; words: number };
      },
      { timeout: flushTimeout },
    )
    .toMatchObject({ text: expect.stringContaining(sentence) });

  // The demo's own view of the same row.
  await expect(page.getByText('Saved to the database')).toBeVisible();

  // The document, not just the connection, is what survives: a reload rejoins
  // the room and the room reloads the document.
  await gotoHydrated(page, '/app/notes');
  // The editor mounts empty and fills in when the room syncs, so this waits
  // on the socket rather than on the render.
  await expect(page.getByLabel('Notes editor')).toContainText(sentence, { timeout: flushTimeout });
});
