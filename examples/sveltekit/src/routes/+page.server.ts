import { stet } from '$lib/server/stet.gen';

import type { PageServerLoad } from './$types';

// Content is loaded in +page.server.ts files, so the organization API key
// (STET_API_KEY) never reaches the browser: the generated client lives in
// $lib/server, which SvelteKit refuses to import from client-side code.

export const load: PageServerLoad = async () => {
  return { landing: await stet.landing.get() };
};
