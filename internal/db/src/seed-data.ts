// Deterministic data written by `pnpm seed` and referenced by e2e tests. The
// demo workspace those accounts sign in to — the content model, its posts,
// their bodies, and the files they point at — lives in internal/seed.

const seedPassword = 'seed-password-123';

export const seedUser = {
  id: 'seed-user',
  name: 'Seed User',
  email: 'seed@example.com',
  password: seedPassword,
};

// Platform staff for the admin panel. Separate from seedUser so e2e tests can
// check that a regular account cannot reach /app/admin. Owns its own
// organization because /app redirects members of none to org creation.
export const seedAdmin = {
  id: 'seed-admin',
  name: 'Seed Admin',
  email: 'admin@example.com',
  password: seedPassword,
};

// Who the demo posts are by. Ordinary members of the seed organization, so
// they fill person fields and the presence list; they share seedUser's
// password so a second browser can join a document as someone else.
export const seedAuthors = [
  { id: 'seed-author-nadia', name: 'Nadia Okonkwo', email: 'nadia@example.com' },
  { id: 'seed-author-tomas', name: 'Tomas Ferreira', email: 'tomas@example.com' },
  { id: 'seed-author-priya', name: 'Priya Raman', email: 'priya@example.com' },
].map((author) => ({ ...author, password: seedPassword }));

export const seedOrganization = {
  id: 'seed-org',
  name: 'Seed Org',
  slug: 'seed-org',
};

export const seedAdminOrganization = {
  id: 'seed-admin-org',
  name: 'Seed Admin Org',
  slug: 'seed-admin-org',
};

export const seedInvitation = {
  id: 'seed-invite',
  email: 'invited@example.com',
};

// The one file in the seed org that is not an image, so full-text search has
// a name to match on and the download path has something to serve. Its bytes,
// and every other file's, are written by internal/seed.
export const seedAsset = {
  id: 'seed-asset',
  name: 'quarterly report.pdf',
};

// The seed org is on the paid plan so paid-plan state is assertable in e2e
// tests without Stripe credentials, and so its member limit leaves invites
// headroom. The Stripe ids are synthetic; nothing in the tests talks to
// Stripe about them.
export const seedSubscription = {
  id: 'seed-subscription',
  plan: 'paid',
  stripeCustomerId: 'cus_seed',
  stripeSubscriptionId: 'sub_seed',
};

// A deterministic organization API key (the seed stores its hash, exactly as
// verifyApiKey expects) so the example app and curl work straight after a
// reseed with no minting step. Local development only.
export const seedApiKey = {
  id: 'seed-api-key',
  name: 'Seed key',
  key: 'stet_seed_key_for_local_development_only',
};

// The content model examples/tanstack's committed stet.gen.ts is generated
// from, so a reseed leaves the example serving real entries.
export const seedContent = {
  posts: { id: 'seed-type-posts', slug: 'posts', name: 'Posts' },
  landing: { id: 'seed-type-landing', slug: 'landing', name: 'Landing' },
};
