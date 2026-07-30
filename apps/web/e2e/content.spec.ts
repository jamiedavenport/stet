import { seedOrganization } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import { gotoHydrated } from './helpers';

const originHeader = { origin: process.env.E2E_BASE_URL ?? 'http://localhost:3000' };

// The New menu creates the type immediately as "Untitled" and lands on its
// page; the name is edited in place there.
async function createType(
  page: import('@playwright/test').Page,
  kind: 'collection' | 'map',
  name: string,
) {
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: `New ${kind}` }).click();
  const nameInput = page.getByLabel(kind === 'map' ? 'Map name' : 'Collection name');
  await expect(nameInput).toHaveValue('Untitled');
  await nameInput.fill(name);
  await nameInput.blur();
  await expect(nameInput).toHaveValue(name);
}

// The whole editor-side happy path: model a collection from the sidebar,
// shape its fields, fill an entry inline in the table (title and slug
// included), and write its body in the entry editor.
test('collections: model, table editing, and the entry editor', async ({ page }) => {
  const name = `Posts ${Date.now()}`;

  await gotoHydrated(page, '/app');
  await createType(page, 'collection', name);

  // Creation lands on the new collection's table, its name editable in place.
  await expect(page.getByLabel('Collection name')).toHaveValue(name);

  await page.getByRole('button', { name: 'Add a field' }).click();
  await page.getByLabel('Field name').fill('Summary');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Summary', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add a field' }).click();
  await page.getByLabel('Field name').fill('Body');
  await page.getByRole('button', { name: 'Rich text' }).click();

  await page.getByRole('button', { name: 'New entry' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Untitled' });

  // Inline cell editing commits on Enter.
  await row.getByRole('button', { name: 'Summary value' }).click();
  await page.getByLabel('Cell value').fill('Hello from the table');
  await page.keyboard.press('Enter');
  await expect(row.getByText('Hello from the table')).toBeVisible();

  // The slug and title are cells like any other.
  await row.getByRole('button', { name: 'Slug', exact: true }).click();
  await page.getByLabel('Slug value').fill('hello-world');
  await page.keyboard.press('Enter');
  await expect(row.getByText('hello-world')).toBeVisible();

  await row.getByRole('button', { name: 'Title', exact: true }).click();
  await page.getByLabel('Title value').fill('Hello World');
  await page.keyboard.press('Enter');

  const renamed = page.getByRole('row').filter({ hasText: 'hello-world' });
  await expect(renamed.getByText('Hello World')).toBeVisible();

  // The rich text cell opens that body's own editor page, which the
  // breadcrumb names back to the entry it belongs to.
  await renamed.getByRole('link', { name: 'Open', exact: true }).click();
  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Hello World' }),
  ).toBeVisible();

  const body = page.getByLabel('Body body');
  await expect(body).toBeVisible();
  await body.click();
  await page.keyboard.type('Written together.');
  await expect(body).toContainText('Written together.');

  // Back on the table the rename holds. The breadcrumb is scoped to main
  // because the sidebar carries an identically named link.
  await page.getByRole('main').getByRole('link', { name }).click();
  await expect(page.getByText('Hello World')).toBeVisible();
});

// The developer side of the same gap: what marketing modelled above must
// come back typed through the public API, bodies as markdown.
test('the public API serves modelled content with markdown bodies', async ({ page, request }) => {
  // The body reaches the API through the room's D1 mirror, so the poll below
  // alone can spend most of the default budget on a cold server.
  test.slow();
  const name = `Docs ${Date.now()}`;

  await gotoHydrated(page, '/app');
  await createType(page, 'collection', name);
  await expect(page.getByLabel('Collection name')).toHaveValue(name);

  await page.getByRole('button', { name: 'Add a field' }).click();
  await page.getByLabel('Field name').fill('Summary');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Summary', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add a field' }).click();
  await page.getByLabel('Field name').fill('Body');
  await page.getByRole('button', { name: 'Rich text' }).click();
  await expect(page.getByRole('button', { name: 'Body', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'New entry' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Untitled' });
  await row.getByRole('button', { name: 'Summary value' }).click();
  await page.getByLabel('Cell value').fill('From the API');
  await page.keyboard.press('Enter');

  await row.getByRole('link', { name: 'Open', exact: true }).click();
  const body = page.getByLabel('Body body');
  await body.click();
  await page.keyboard.type('# Heading\n\nServed as markdown.');

  const created = await request.post('/api/auth/api-key/create', {
    data: { name: 'content-e2e-key', organizationId: seedOrganization.id },
    headers: originHeader,
  });
  expect(created.status()).toBe(200);
  const key = ((await created.json()) as { key: string }).key;
  const headers = { 'x-api-key': key };

  const model = await request.get('/api/v1/model', { headers });
  expect(model.status()).toBe(200);
  const { types } = (await model.json()) as {
    types: { slug: string; name: string; fields: { key: string; type: string }[] }[];
  };
  const type = types.find((candidate) => candidate.name === name);
  expect(type).toBeDefined();
  expect(type!.fields.map((field) => [field.key, field.type])).toEqual([
    ['summary', 'text'],
    ['body', 'rich_text'],
  ]);

  // The body reaches the API through the room's D1 mirror, which trails live
  // editing by a few seconds.
  await expect
    .poll(
      async () => {
        const list = await request.get(`/api/v1/content/${type!.slug}`, { headers });
        const data = (await list.json()) as {
          entries: { fields: Record<string, unknown> }[];
        };
        return data.entries[0]?.fields.body ?? null;
      },
      { timeout: 30_000 },
    )
    .toContain('Served as markdown.');

  const one = await request.get(`/api/v1/content/${type!.slug}/untitled`, { headers });
  expect(one.status()).toBe(200);
  const entry = (await one.json()) as { title: string; fields: Record<string, unknown> };
  expect(entry.title).toBe('Untitled');
  expect(entry.fields.summary).toBe('From the API');
  expect(entry.fields.body).toContain('# Heading');
});

// A map is one entry as a key/value table: keys edit inline, and a rich
// text key opens its own collaborative editor page.
test('maps edit as a key/value table', async ({ page }) => {
  const name = `Landing ${Date.now()}`;

  await gotoHydrated(page, '/app');
  await createType(page, 'map', name);
  await expect(page.getByLabel('Map name')).toHaveValue(name);

  await page.getByRole('button', { name: 'Add a field' }).click();
  await page.getByLabel('Field name').fill('Headline');
  await page.getByRole('button', { name: 'Text', exact: true }).click();

  const headline = page.getByRole('row').filter({ hasText: 'Headline' });
  await headline.getByRole('button', { name: 'Headline value' }).click();
  await page.getByLabel('Cell value').fill('Both teams at full speed');
  await page.keyboard.press('Enter');
  await expect(headline.getByText('Both teams at full speed')).toBeVisible();

  await page.getByRole('button', { name: 'Add a field' }).click();
  await page.getByLabel('Field name').fill('Pitch');
  await page.getByRole('button', { name: 'Rich text' }).click();

  const pitch = page.getByRole('row').filter({ hasText: 'Pitch' });
  await pitch.getByRole('link', { name: 'Open', exact: true }).click();

  const body = page.getByLabel('Pitch body');
  await expect(body).toBeVisible();
  await body.click();
  await page.keyboard.type('Neither waits.');
  await expect(body).toContainText('Neither waits.');
});
