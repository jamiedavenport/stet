import { expect, test } from '@playwright/test';

import { gotoHydrated } from './helpers';

// Runs in the "app" project, already signed in. The seeded organization is on
// the paid plan, so the panel opens straight into the chat; sending a message
// needs an Anthropic key and is exercised by hand for now.

test('the assistant panel toggles from the header and Cmd+I', async ({ page }) => {
  // Opening the panel once flashed the whole page: the chat hook suspends,
  // and without its own boundary that reached the router's.
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Switched to client rendering')) {
      hydrationErrors.push(message.text());
    }
  });

  await gotoHydrated(page, '/app');

  await page.getByRole('button', { name: 'Toggle the assistant' }).click();
  const input = page.getByPlaceholder('Ask the assistant…');
  await expect(input).toBeVisible();
  await expect(page.getByText('Looking at: Home')).toBeVisible();

  // The shell is viewport-locked: only the page column and the messages
  // scroll, never the window.
  const windowScrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight + 1,
  );
  expect(windowScrolls).toBe(false);
  expect(hydrationErrors).toEqual([]);

  await page.keyboard.press('ControlOrMeta+i');
  await expect(input).toBeHidden();
});

test('the command menu offers the assistant', async ({ page }) => {
  await gotoHydrated(page, '/app');

  await page.keyboard.press('ControlOrMeta+k');
  const menu = page.getByRole('dialog', { name: 'Command menu' });
  await menu.getByRole('option', { name: 'Ask the assistant' }).click();

  await expect(menu).toBeHidden();
  await expect(page.getByPlaceholder('Ask the assistant…')).toBeVisible();
});
