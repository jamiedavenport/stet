// Deterministic data written by `pnpm seed` and referenced by e2e tests.
export const seedUser = {
  id: 'seed-user',
  name: 'Seed User',
  email: 'seed@example.com',
  password: 'seed-password-123',
};

// Platform staff for the admin panel. Separate from seedUser so e2e tests can
// check that a regular account cannot reach /app/admin. Owns its own
// organization because /app redirects members of none to org creation.
export const seedAdmin = {
  id: 'seed-admin',
  name: 'Seed Admin',
  email: 'admin@example.com',
  password: 'seed-password-123',
};

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

// An uploaded file in the seed org, so full-text search has something to
// match. Nothing writes these bytes to R2: only the row is needed, and only
// search reads it.
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
// from, so a reseed leaves the example serving real entries. Rich text
// bodies live in realtime documents the seed does not fabricate: body fields
// serve null until someone writes in the app.
export const seedContent = {
  posts: { id: 'seed-type-posts', slug: 'posts', name: 'Posts' },
  landing: { id: 'seed-type-landing', slug: 'landing', name: 'Landing' },
  post: { id: 'seed-entry-hello', slug: 'hello-world', title: 'Hello World' },
};
