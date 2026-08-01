import 'server-only';

// The organization API key lives in STET_API_KEY, which only the server may
// read. Routing every import of the generated client through this module makes
// that structural rather than a convention: `server-only` turns an accidental
// client-component import into a build error instead of a leaked key.
export * from '@/stet.gen';
