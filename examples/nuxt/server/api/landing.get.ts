import { stet } from '../stet.gen';

// Content is fetched in server routes so the organization API key
// (STET_API_KEY) never reaches the browser.
export default defineEventHandler(() => stet.landing.get());
